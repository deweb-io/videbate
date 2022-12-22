import * as bbs from 'https://cdn.jsdelivr.net/npm/@dewebio/bbs-common';

await bbs.initialize('creator-eco-stage');

const getEnrichedSDK = () => {
    const sdk = {...bbs, util: {}};
    const getCurrentCommunity = () => 'DEBATE';
    sdk.util.community = getCurrentCommunity();
    window.addEventListener('popstate', () => sdk.util.community = getCurrentCommunity());
    return sdk;
};

const BBS_SDK = getEnrichedSDK();

const VIDEBATE_DATA_BLOCK_TYPE = 'videbate';

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
        console.log('we do not do this anymore');
        composeDiv.remove();
        state.postsDiv.draw();
    };
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
    statusDiv.add('p', null, {textContent: state.currentPost ? `
            viewing ${state.currentPost.title} on ${BBS_SDK.util.community}
        ` : `
            viewing debates on ${BBS_SDK.util.community}
        `});
    return statusDiv;
});

// The main function.
export const mount = async(appElement) => {
    state.statusDiv = addStatusDiv(appElement);
    window.addEventListener('popstate', () => state.statusDiv.draw());
    setInterval(state.statusDiv.draw, 1000);

    state.menuDiv = addMenuDiv(appElement);

    const updateDAG = async() => {
        const posts = await bbs.getPostsByCommunity(BBS_SDK.util.community);
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
};
