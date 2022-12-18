// Common BBS functionality.

// Firebase & Firestore imports.
let initializeApp, getFirestore, getDocs, collection, query, where;

// Import Firebase & Firestore First.
await importFirebase();
await importFirestore();

const Firestore = {
    db: false
};

export const initialize = async(firebaseConfig) => {
    // Should have a proper check, like in reminder code.
    if(Firestore.db) {
        return console.error('Firebase already initialized');
    }

    const app = initializeApp(firebaseConfig);
    Firestore.db = getFirestore(app);
    console.info('Firebase initialized');
};

export async function getPosts() {
    const querySnapshot = await getDocs(collection(Firestore.db , 'Post'));
    querySnapshot.forEach((doc) => {
      console.log(`${doc.id} => ${JSON.stringify(doc.data())}`);
    });
}

export async function getPostById(id) {
    const queryBuild = query(collection(Firestore.db, 'Post'), where('id', '==', id));
    const querySnapshot = await getDocs(queryBuild);
    querySnapshot.forEach((doc) => {
        console.log(`${doc.id} => ${JSON.stringify(doc.data())}`);
    });
}

async function importFirebase() {
    let firebase;
    try {
        firebase = await import('firebase/app');
    } catch (error) {
        firebase = await import('https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js');
    }
    initializeApp = firebase.initializeApp;
}

async function importFirestore() {
    let firestore;
    try {
        firestore = await import('firebase/firestore');
    } catch (error) {
        firestore = await import('https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js');
    }
    getFirestore = firestore.getFirestore;
    getDocs = firestore.getDocs;
    collection = firestore.collection;
    query = firestore.query;
    where = firestore.where;
}
