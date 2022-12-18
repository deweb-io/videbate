// Common BBS functionality.

// TODO: Make this work :)
// import * as firebase from 'https://www.gstatic.com/firebasejs/7.22.1/firebase-app.js';

const Firestore = {
    db: false
};

export const initialize = async(firebaseConfig) => {
    // Should have a proper check, like in reminder code.
    if(Firestore.db) {
        return console.error('Firebase already initialized');
    }
    const fb = firebase.initializeApp(firebaseConfig).firebase_;
    console.info('Firebase initialized', fb);

    // This doesn't quite work right now - need to find the right path in the object.
    // Firestore.db = fb.firestore();
};

export async function getPostById(id) {
    const postRef = await Firestore.db.collection('Post').doc(id);
    const post = await postRef.get();
    if(!post.exists) {
        console.log('No such document!');
    }   else {
        console.log('Document data:', post.data());
        return post.data();
    }
}
