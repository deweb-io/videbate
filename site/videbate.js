// Try to import bbs-common from our server, defaulting to the CDN if that fails.
let isRemote = false;
const bbs = await import('./bbs-common.js').catch(() => {
    isRemote = true;
    return import('https://cdn.jsdelivr.net/npm/@dewebio/bbs-common@latest/index.min.js');
});
console.info(`bbs-common library loaded from ${isRemote ? 'remote CDN' : 'local file'}`, bbs);

const STATE = {post: null};

// UI framework.
Element.prototype.add = async function(tagName, className, attributes, drawFunction) {
    const element = this.appendChild(document.createElement(tagName));
    element.classList.add(...(className ? (Array.isArray(className) ? className : [className]) : []));
    for(const [attribute, value] of Object.entries(attributes || {})) element[attribute] = value;
    if(drawFunction) {
        element.draw = () => drawFunction(element);
        await element.draw();
    }
    return element;
};
// Element.prototype.remove = async function(tagName, className, attributes, drawFunction) {

const FULL_EXPERIENCE_WIDTH = 600; // TODO - We will need to think this through.

// Required because browsers often block autoplay.
const play = (videoElement) => {
    try {
        videoElement.play();
    } catch(_) {/* ignore */}
};

const addControlDiv = async(videoElement) => videoElement.parentNode.add('div', 'controls', null, async(controlDiv) => {
    controlDiv.navigate = async(partialPostId) => {
        const post = await new Promise((resolve, reject) => fetch(`/post/${partialPostId}`).then(
            (response) => response.json()
        ).then(resolve).catch(reject));
        STATE.post = post;
        videoElement.draw();
        window.location.hash = post.id;
    };

    controlDiv.add('button', null, {
        innerText: 'parent', onclick: async() => {
            controlDiv.navigate(STATE.post.id.slice(0, -1).join(','));
        }
    });
});

const addVideoElement = async(parent) => parent.add('video', null, {
    autoplay: true, controls: true, muted: true, src: STATE.post.video_url
}, async(videoElement) => {
    if(videoElement.src !== STATE.post.videoUrl) {
        videoElement.src = STATE.post.videoUrl;
        if(videoElement.classList.contains('full')) {
            play(videoElement);
        }
    }
    if(window.innerWidth >= FULL_EXPERIENCE_WIDTH && !videoElement.classList.contains('full')) {
        play(videoElement);
        videoElement.controls = false;
        videoElement.classList.add('full');
        videoElement.controlDiv = await addControlDiv(videoElement);
    } else if(window.innerWidth < FULL_EXPERIENCE_WIDTH && videoElement.classList.contains('full')) {
        videoElement.controlDiv.remove();
        videoElement.classList.remove('full');
        videoElement.controls = true;
    }
});

// The main function.
export const show = async(appElement, post) => {
    STATE.post = post;
    const videoElement = await addVideoElement(appElement);
    window.addEventListener('resize', () => videoElement.draw());
};
