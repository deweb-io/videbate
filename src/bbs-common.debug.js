// Common BBS functionality.

const importFirstOf = async(...names) => {
    const errors = [];
    for(const name of names) {
        try {
            return await import(name);
        } catch(error) {
            errors.push(error);
        }
    }
    throw new Error(`Could not find any of the following modules: ${names.join(', ')} - ${errors.map(
        (error) => error.message || error
    ).join(', ')}`);
};

export const firebase = await importFirstOf(
    'firebase/app', './firebase.js', 'https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js'
);
export const firestore = await importFirstOf(
    'firebase/firestore', './firebase-firestore.js', 'https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js'
);
export let closer = null;
let postsCollection = null;

export const initialize = async(firebaseProject) => {
    // We should have a better check, like counting apps in firebase-admin.
    if(postsCollection) {
        return console.warn('Not attempting to initialize Firebase again.');
    }
    const app = firebase.initializeApp({projectId: firebaseProject});
    const firestoreInstance = firestore.getFirestore(app);
    postsCollection = firestore.collection(firestoreInstance, 'Post');
    closer = () => {
        firestore.terminate(firestoreInstance);
    };

    console.info('Firebase initialized');
};

export const getPostsByCommunity = async(community) => (await firestore.getDocs(await firestore.query(
    postsCollection, firestore.where('tokenName', '==', community)
))).docs.map((doc) => doc.data());

export const getPostById = async(id) => {
    const docRef = firestore.doc(postsCollection, id);
    const doc = await firestore.getDoc(docRef);
    try {
        console.log(`
        ATTENTION: Line above just retrieved a post from Firebase.
        The fact that this line prints, proves that we succeeded in retrieving the post.
        In fact, we can print the post title: "${doc.data().title}"
        However, the test will now hang, probably because the runnning process is waiting for the promise to resolve.
        Comment out the getDoc line above and the test will pass.
    `);
    } catch(_) {
        console.warn('--- just using mock data  ---');
    }

    return {
        tokenName: 'DEBATE',
        publisherId: '3950249048075650071',
        prevUpvoters: [],
        publisherName: 'israel@STGfb',
        publishedDayTimestamp: 19340,
        numUpvotes: 0,
        uniqueReactionsCount: 0,
        id: 'SK5we2vyudZoUwF5ee6g',
        title: 'JS Must Die',
        postTypes: [
            'text'
        ],
        numComments: 0,
        elasticLastUpdateTime: {
            seconds: 1671703871,
            nanoseconds: 427000000
        },
        contentBonusGivenAt: 0,
        createdAt: {
            seconds: 1671054952,
            nanoseconds: 407000000
        },
        publishedYearAndMonth: '2022-12',
        status: 0,
        publishedWeekTimestamp: 2762,
        dna: [
            {
                weight: 0.3888630121946335,
                name: 'Arts & Entertainment'
            },
            {
                weight: 0.3888630121946335,
                name: 'Music & Audio'
            },
            {
                weight: 0.2462676763534546,
                name: 'Rock Music'
            },
            {
                weight: 0.1425953358411789,
                name: 'Urban & Hip-Hop'
            }
        ],
        upvoteAmount: 0,
        upvoteTime: {
            seconds: 949363200,
            nanoseconds: 0
        },
        postContent: '' +
            '{"time":1671054885053,"blocks":[{"type":"paragraph","data":' +
            '{"text":"It\'s a horrible language"}},{"type":"videbate","data":' +
            '{"parentPost":null}}],"version":"2.22.2"}'
    };
};
