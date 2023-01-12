// Try to import bbs-common from our server, defaulting to the CDN if that fails.
let isRemote = false;
const bbs = await import('./bbs-common.js').catch(() => {
    isRemote = true;
    return import('https://cdn.jsdelivr.net/npm/@dewebio/bbs-common@latest/index.min.js');
});
console.info(`bbs-common library loaded from ${isRemote ? 'remote' : 'local'}:`, bbs);

// UI framework.
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

// The main function.
export const show = async(appElement, postData) => {
    console.log('show', postData);
    appElement.add('div', 'section', {innerHTML: postData.id});
};
