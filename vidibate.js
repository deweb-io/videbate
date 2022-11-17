// Encapsulate.
(function(){'use strict';

    // Placeholder for the BBS SDK, to be loaded lazily by the Single SPA boilerplate below.
    let BBS_SDK = null;

    // Vidibate logic.

    const state = {currentPost: null, parentPost: null};

    const getPosts = async() => (
        await BBS_SDK.upvoteModule.getPosts(BBS_SDK.comfort.community, null, 1000)
    ).items.filter(
        (post) => post.status === 0
    ).map((post) => (
        {...post, postContent: JSON.parse(post.postContent)}
    )).reduce((posts, post) => {
        const vidibateBlock = post.postContent.blocks.find((block) => block.type === 'vidibate');
        if(vidibateBlock === undefined) return posts;
        if(vidibateBlock.data.parent !== (state.currentPost && state.currentPost.id)) return posts;
        return {...posts, [post.id]: {...post, vidibate: vidibateBlock.data}};
    }, {});

    const createPost = (title, content) => BBS_SDK.upvoteModule.createPost({
        tokenName: BBS_SDK.comfort.community,
        title: title,
        categoryId: 'ALL',
        publisher: BBS_SDK.comfort.user.id,
        content: JSON.stringify({
            time: Date.now(),
            blocks: [{
                type: 'paragraph',
                data: {text: content}
            }, {
                type: 'vidibate',
                data: {parent: state.currentPost && state.currentPost.id}
            }],
            version: '2.22.2'
        })
    });

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
            console.log(await createPost(titleInput.value, contentInput.value));
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
        if(!state.composeDiv) {
            const createPostLi = menuUl.add('li', null, {textContent: state.currentPost ? 'Reply' : 'Challenge'});
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
        Object.values(await getPosts()).forEach((post) => {
            const postLi = postsUl.add('li');
            postLi.innerHTML = post.title;
            postLi.addEventListener('click', async() => {
                state.currentPost = post;
                await postsDiv.draw();
                state.composeDiv && state.composeDiv.remove();
            });
        });
        state.menuDiv && state.menuDiv.draw();
        return postsDiv;
    });

    const addStatusDiv = (parentElement) => parentElement.add('div', 'section', null, function(statusDiv) {
        statusDiv.innerHTML = '';
        statusDiv.add('p', 'sectionTitle', {textContent: 'Status'});
        statusDiv.add('p', null, {textContent: `
                I'm ${BBS_SDK.comfort.user ? BBS_SDK.comfort.user.displayName : 'not logged in'}
            `});
        statusDiv.add('p', null, {textContent: state.currentPost ? `
                viewing ${state.currentPost.title} on ${BBS_SDK.comfort.community}
            ` : `
                viewing debates on ${BBS_SDK.comfort.community}
            `});
        return statusDiv;
    });

    // The main function.
    const vidibate = async(appElement) => {
        state.statusDiv = addStatusDiv(appElement);
        window.addEventListener('popstate', () => state.statusDiv && state.statusDiv.draw());
        await BBS_SDK.accountModule.onAuthStateChanged(() => state.statusDiv && state.statusDiv.draw());
        setInterval(state.statusDiv.draw, 1000);

        state.menuDiv = addMenuDiv(appElement);

        state.postsDiv = await addPostsDiv(appElement);

        window.sdk = BBS_SDK;
        window.state = state;
        window.getPosts = getPosts;
    };

    // From here on, it's all stuff that we should supply the dapplet developer with.
    // Getting the SDK from systemJS, improving it a bit, and playing nice with Single SPA.

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

    // Initialize the SDK with some comfort functionality.
    const getEnrichedSDK = async() => {
        const sdk = {...await getSDK(), comfort: {}};
        const getCurrentCommunity = () => window.location.href.split('/')[3];
        sdk.comfort.community = getCurrentCommunity();
        window.addEventListener('popstate', () => sdk.comfort.community = getCurrentCommunity());
        const updateUser = async(user) => {
            if(user) {
                sdk.comfort.user = (await sdk.accountModule.getUsersByFirebaseUid(user.uid))[0];
            } else {
                sdk.comfort.user = null;
            }
        };
        await sdk.accountModule.onAuthStateChanged(updateUser);
        await updateUser(await sdk.accountModule.getCurrentFirebaseUser());
        return sdk;
    };

    // General handling of a Single SPA lifecycle stage.
    const generalStageFunctions = async(name, stageFunction, singleSpaArgs) => {
        if(BBS_SDK === null) {
            BBS_SDK = await getEnrichedSDK();
            console.info('BBS SDK loaded');
        }
        const element = singleSpaArgs.domElement;
        console.info(`starting stage ${name} on element: ${element}`);
        await stageFunction(element);
        console.info(`completed stage ${name}`);
    };

    // The specific functions for the lifecycle stages.
    const stages = {
        bootstrap: async() => null,
        mount: async(element) => {
            try {
                vidibate(element, BBS_SDK);
            } catch(error) {
                console.error(error);
            }
        },
        unmount: async(element) => {
            element.innerHTML = '';
        },
        unload: async() => null
    };

    // Bundle it all together.
    define(Object.values(stages).reduce((requireable, stage) => (
        {...requireable, [stage.name]: async(...args) => await generalStageFunctions(stage.name, stage, args[0])}
    ), {}));

}());
