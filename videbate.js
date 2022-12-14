// Encapsulate.
(function(){'use strict';

    // Helper function that encapsulates all the boilerplate involved in running a dapplet.
    // This includes handling integration with Single SPA and providing the SDK with some utilities.
    // The function receives (optional) functions corresponding to the four Single SPA lifecycle stages:
    // - bootstrap: called when the dapplet is first loaded into Single SPA.
    // - mount: called when the dapplet is mounted into the DOM.
    // - unmount: called when the dapplet is unmounted from the DOM.
    // - unload: called when the dapplet is removed from Single SPA.
    // These functions will be called by the helper with two arguments:
    // - the BBS SDK object.
    // - the DOM element that the dapplet is mounted to.
    const registerDappletLifecycleStages = (bootstrap, mount, unmount, unload) => {

        // Placeholder for the BBS SDK, to be loaded on demand.
        let BBS_SDK = null;

        // Synchronous loading of the SDK.
        // Note that we load the operator configuation by adding a script tag.
        const getSDK = () => new Promise((resolve) => {
            const scriptTag = document.createElement('script');
            scriptTag.addEventListener('load', async() => resolve(
                new (await System.import('@deweb/bbs-sdk')).default.default(BBS_OPERATOR_CONFIGURATION)
            ));
            scriptTag.src = 'http://localhost:8000/bbs-sdk.config.js';
            document.body.appendChild(scriptTag);
        });

        // Initialize the SDK with some comfortable utilities.
        const getEnrichedSDK = async() => {
            const sdk = {...await getSDK(), util: {}};
            const getCurrentCommunity = () => window.location.href.split('/')[3];
            sdk.util.community = getCurrentCommunity();
            window.addEventListener('popstate', () => sdk.util.community = getCurrentCommunity());
            const updateUser = async(user) => {
                if(user) {
                    sdk.util.user = (await sdk.accountModule.getUsersByFirebaseUid(user.uid))[0];
                } else {
                    sdk.util.user = null;
                }
            };
            await sdk.accountModule.onAuthStateChanged(updateUser);
            await updateUser(await sdk.accountModule.getCurrentFirebaseUser());
            return sdk;
        };

        // General handling of a Single SPA lifecycle stage.
        const stageFunction = async(name, stageFunction, singleSpaArgs) => {
            if(BBS_SDK === null) {
                BBS_SDK = await getEnrichedSDK();
                console.info('BBS SDK loaded');
            }
            const element = singleSpaArgs.domElement;
            console.info(`starting stage ${name} on element: ${element} (with ${BBS_SDK})`);
            await stageFunction(element, BBS_SDK);
            console.info(`completed stage ${name}`);
        };

        // Bundle the stages together as AMD definitions.
        define(Object.entries({
            bootstrap: bootstrap,
            mount: mount,
            unmount: unmount,
            unload: unload
        }).reduce((definitions, [stageName, stage]) => (
            {...definitions, [stageName]: async(...args) => await stageFunction(stageName, stage, args[0])}
        ), {}));
    };

    // Here starts the actual videbate application.

    const CONTENT_VERSION = '2.22.2';
    const VIDEBATE_DATA_BLOCK_TYPE = 'videbate';
    const VIDEBATE_CONTENT_BLOCK_TYPE = 'paragraph'; // Should be video, naturally.

    // The global BBS_SDK object is populated on the bootstrap stage.
    let BBS_SDK = null;
    const bootstrap = (_, bbs_sdk) => BBS_SDK = bbs_sdk;

    // SDK usage.

    // This function is meant to fetch all of a community's active posts.
    // NOTE: Current implementation only fetches the first thousand posts!
    // NOTE: It would be lovely if we had a way to fetch only the videbate posts.
    const fetchPosts = async(community) => (
        await BBS_SDK.upvoteModule.getPosts(community, null, 1000)
    ).items.filter((post) => post.status === 0);

    // Publish a videbate post.
    const publish = (community, categoryId, publisher, title, content, parentPost) => BBS_SDK.upvoteModule.createPost({
        tokenName: community,
        categoryId: categoryId,
        publisher: publisher,
        title: title,
        content: JSON.stringify({
            time: Date.now(),
            blocks: [{
                type: VIDEBATE_CONTENT_BLOCK_TYPE,
                data: {text: content}
            }, {
                type: VIDEBATE_DATA_BLOCK_TYPE,
                data: {parentPost}
            }],
            version: CONTENT_VERSION
        })
    });

    // Filter videbate posts, bucketed by parent post.
    const bucketPostsByVidebateParent = (posts) => posts.reduce((postsByParent, post) => {
        const postContent = JSON.parse(post.postContent);
        const videbateBlock = postContent.blocks.find((block) => block.type === VIDEBATE_DATA_BLOCK_TYPE);
        return videbateBlock ? {
            ...postsByParent,
            [videbateBlock.data.parentPost]: [
                ...(postsByParent[videbateBlock.data.parentPost] || []),
                {...post, postContent, videbate: videbateBlock.data}
            ]
        } : postsByParent;
    }, {});

    // Organize posts into a DAG.
    const buildDAG = (posts) => {
        const postsByParent = bucketPostsByVidebateParent(posts);
        const mapChildPosts = (post) => ({
            ...post, childPosts: (postsByParent[post.id] || []).map(mapChildPosts)
        });
        const mapParent = (post, parentPost) => {
            post.parentPost = parentPost;
            post.childPosts.forEach((childPost) => mapParent(childPost, post));
            return post;
        };
        return (postsByParent[null] || []).map(mapChildPosts).map((post) => mapParent(post, null));
    };

    // Global state.
    const state = {posts: null, DAG: null, currentPost: null, undoStack: []};

    // Get all videbate posts on the current node in the DAG.
    const getPosts = async() => (
        await BBS_SDK.upvoteModule.getPosts(BBS_SDK.util.community, null, 1000)
    ).items.filter(
        (post) => post.status === 0
    ).map((post) => (
        {...post, postContent: JSON.parse(post.postContent)}
    )).reduce((posts, post) => {
        const videbateBlock = post.postContent.blocks.find((block) => block.type === VIDEBATE_DATA_BLOCK_TYPE);
        if(videbateBlock === undefined) return posts;
        if(videbateBlock.data.parentPost !== (state.currentPost && state.currentPost.id)) return posts;
        return {...posts, [post.id]: {...post, videbate: videbateBlock.data}};
    }, {});

    // UI.
    const STYLES = {
        section: {
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '8px',
            margin: '8px',
            width: '35%'
        },
        sectionTitle: {
            fontSize: '1.2em',
            fontWeight: 'bold'
        },
        activePost: {
            border: '2px solid red',
            backgroundColor: '#eee'
        },
        postTitle: {
            fontSize: '1.1em',
            fontWeight: 'bold'
        }
    };

    Element.prototype.add = function(tagName, styleName, attributes, drawFunction) {
        const element = this.appendChild(document.createElement(tagName));
        for(const [property, value] of Object.entries(STYLES[styleName] || {})) element.style[property] = value;
        for(const [attribute, value] of Object.entries(attributes || {})) element[attribute] = value;
        if(drawFunction) {
            element.draw = () => drawFunction(element);
            return drawFunction(element);
        }
        return element;
    };

    const addComposeDiv = (parentElement) => {
        const composeDiv = parentElement.add('div', 'section');
        composeDiv.remove = () => {
            composeDiv.parentElement.removeChild(composeDiv);
            state.composeDiv = null;
            state.menuDiv.draw();
        };
        const submitPost = async() => {
            console.log(await publish(
                BBS_SDK.util.community,
                'ALL',
                BBS_SDK.util.user.id,
                titleInput.value,
                contentInput.value,
                state.currentPost && state.currentPost.id
            ));
            composeDiv.remove();
            state.postsDiv.draw();
        };
        const titleInput = composeDiv.add('input', null, {placeholder: 'Title'});
        const contentInput = composeDiv.add('input', null, {placeholder: 'Content'});
        contentInput.addEventListener('keyup', (event) => event.key === 'Enter' && submitPost());
        const submitButton = composeDiv.add('button', null, {textContent: 'Submit'});
        submitButton.addEventListener('click', submitPost);
        return composeDiv;
    };

    const addMenuDiv = (appDiv) => appDiv.add('div', 'section', null, (menuDiv) => {
        menuDiv.innerHTML = '';
        menuDiv.add('p', 'sectionTitle', {textContent: 'Menu'});
        const menuUl = menuDiv.add('ul');

        // Go to parent post.
        if(state.currentPost) {
            const toParentLi = menuUl.add('li', null, {textContent: 'Go to parent post'});
            toParentLi.addEventListener('click', () => {
                state.currentPost = state.currentPost.parentPost;
                state.postsDiv.draw();
                state.menuDiv.draw();
                state.statusDiv.draw();
            });
        }

        // New post item (either new challenge or new response).
        if(!state.composeDiv) {
            const createPostLi = menuUl.add('li', null, {textContent: state.currentPost ? 'Reply' : 'New Challenge'});
            createPostLi.addEventListener('click', () => {
                state.composeDiv = addComposeDiv(appDiv);
                state.menuDiv.draw();
            });
        }

        return menuDiv;
    });

    const addCurrentPostDiv = (parentElement) => parentElement.add('div', 'activePost', null, (currentPostDiv) => {
        currentPostDiv.innerHTML = '';
        currentPostDiv.add('p', 'postTitle', {textContent: `Current post - ${state.currentPost.title}`});
        currentPostDiv.add('p', null, {textContent: state.currentPost.postContent.blocks.find(
            (block) => block.type === 'paragraph'
        ).data.text});
        return currentPostDiv;
    });

    const addPostsDiv = async(parentElement) => parentElement.add('div', 'section', null, async(postsDiv) => {
        postsDiv.innerHTML = '';
        postsDiv.add('p', 'sectionTitle', {textContent: 'Posts'});
        if(state.currentPost) addCurrentPostDiv(postsDiv);
        const postsUl = postsDiv.add('ul');
        (state.currentPost ? state.currentPost.childPosts : state.DAG).forEach((post) => {
            const postLi = postsUl.add('li');
            postLi.innerHTML = post.title;
            postLi.addEventListener('click', async() => {
                state.currentPost = post;
                await postsDiv.draw();
                state.composeDiv && state.composeDiv.remove();
            });
        });
        state.menuDiv.draw();
        return postsDiv;
    });

    const addStatusDiv = (parentElement) => parentElement.add('div', 'section', null, (statusDiv) => {
        statusDiv.innerHTML = '';
        statusDiv.add('p', 'sectionTitle', {textContent: 'Status'});
        statusDiv.add('p', null, {textContent: `
                I'm ${BBS_SDK.util.user ? BBS_SDK.util.user.displayName : 'not logged in'}
            `});
        statusDiv.add('p', null, {textContent: state.currentPost ? `
                viewing ${state.currentPost.title} on ${BBS_SDK.util.community}
            ` : `
                viewing debates on ${BBS_SDK.util.community}
            `});
        return statusDiv;
    });

    // The main function.
    const mount = async(appElement) => {
        state.statusDiv = addStatusDiv(appElement);
        window.addEventListener('popstate', () => state.statusDiv.draw());
        await BBS_SDK.accountModule.onAuthStateChanged(() => state.statusDiv.draw());
        setInterval(state.statusDiv.draw, 1000);

        state.menuDiv = addMenuDiv(appElement);

        const updateDAG = async() => {
            const posts = await fetchPosts(BBS_SDK.util.community);
            if(posts !== state.posts) {
                state.posts = posts;
                state.DAG = buildDAG(posts);
                return true;
            }
            return false;
        };
        await updateDAG();
        state.postsDiv = await addPostsDiv(appElement);
        setInterval(async() => await updateDAG() && state.postsDiv.draw(), 1000);

        window.sdk = BBS_SDK;
        window.state = state;
        window.getPosts = getPosts;
    };

    // Register the stages.
    registerDappletLifecycleStages(bootstrap, mount);

}());
