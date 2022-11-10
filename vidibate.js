// Encapsulate.
(function(){'use strict';

    // Synchronous loading of the SDK.
    const getSDK = () => new Promise((resolve) => {
        const scriptTag = document.createElement('script');
        scriptTag.addEventListener('load', async() => resolve(
            new (await System.import('@deweb/bbs-sdk')).default.default(BBS_OPERATOR_CONFIGURATION)
        ));
        scriptTag.src = 'http://localhost:8000/bbs-sdk.config.js';
        document.body.appendChild(scriptTag);
    });

    // Placeholder for the BBS SDK, to be loaded on demand.
    let BBS_SDK = null;

    // General handling of a Single SPA lifecycle stage.
    const generalStageFunctions = async(name, stageFunction, singleSpaArgs) => {
        if(BBS_SDK === null) {
            // Load the operator configuation by adding a script tag.
            BBS_SDK = await getSDK();
        }
        const element = singleSpaArgs.domElement;
        console.info(`starting stage ${name} on element: ${element}`);
        await stageFunction(element);
        console.info(`completed stage ${name}`);
    };

    // The specific functions for the lifecycle stages.
    const stages = {
        bootstrap: async(element) => null,
        mount: async(element) => {
            console.log(BBS_SDK);
            element.innerHTML = `I have access to the SDK - ${BBS_SDK}`;
        },
        unmount: async(element) => {
            element.innerHTML = '';
        },
        unload: async(element) => null
    };

    // Bundle it all together.
    define(Object.values(stages).reduce((requireable, stage) => (
        {...requireable, [stage.name]: async(...args) => await generalStageFunctions(stage.name, stage, args[0])}
    ), {}));

}());
