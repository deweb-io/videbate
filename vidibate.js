// Encapsulate.
(function(){'use strict';

    // Placeholder for the BBS SDK, to be loaded lazily by the Single SPA boilerplate below.
    let BBS_SDK = null;

    // SDK handling.

    const getPosts = async(community) => (await Promise.all(
        (await BBS_SDK.upvoteModule.getPosts(community, null, 1000)).items.map((post) => (
            BBS_SDK.upvoteModule.getPost(post.id)
        ))
    )).map((post) => ({...post, postContent: JSON.parse(post.postContent)}));

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
            }],
            version: '2.22.2'
        })
    });

    // Challenge composition form.
    const compose = () => {
        const composeDiv = document.createElement('div');
        const titleInput = document.createElement('input');
        const contentInput = document.createElement('input');
        const submitButton = document.createElement('button');
        submitButton.textContent = 'Submit';
        composeDiv.appendChild(titleInput);
        composeDiv.appendChild(contentInput);
        composeDiv.appendChild(submitButton);

        const submitPost = async() => {
            console.log('posting');
            console.log(await createPost(titleInput.value, contentInput.value));
            composeDiv.parentNode.removeChild(composeDiv);
        };
        contentInput.addEventListener('keyup', (event) => event.key === 'Enter' && submitPost());
        submitButton.addEventListener('click', submitPost);

        return composeDiv;
    };

    // The general menu.
    const menu = (appDiv) => {
        const menuUl = document.createElement('ul');

        const newChallengeLi = document.createElement('li');
        newChallengeLi.addEventListener('click', () => {
            appDiv.appendChild(compose());
        });
        newChallengeLi.innerHTML = 'New Challenge';
        menuUl.appendChild(newChallengeLi);

        const menuDiv = document.createElement('div');
        menuDiv.appendChild(menuUl);
        return menuDiv;
    };

    // The main function.
    const vidibate = async(element) => {
        const posts = await getPosts(BBS_SDK.comfort.community);
        const appDiv = document.createElement('div');
        element.appendChild(appDiv);

        const userDiv = document.createElement('div');
        userDiv.innerHTML = `
            I'm ${BBS_SDK.comfort.user ? BBS_SDK.comfort.user.displayName : 'not logged in'}<br>
            viewing debates on community ${BBS_SDK.comfort.community}<br>
            and I see ${posts.length} posts.
        `;
        appDiv.appendChild(userDiv);

        if(BBS_SDK.comfort.user) appDiv.appendChild(menu(appDiv));
    };

    // From here on, it's all stuff that we should supply the dapplet user with.
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
        console.log(sdk);
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
        window.sdk = sdk;
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
