import { Pinecone } from "../index.js"

const API_KEY = process.env.PINECONE_API_KEY;

if (!API_KEY) {
    console.error("API key not found! Please set PINECONE_API_KEY like this:");
    console.error("PINECONE_API_KEY=... node app.js");
    process.exit(0);
}

const pinecone = new Pinecone(API_KEY,"https://controller.us-west1-gcp.pinecone.io/");

const name = "pretty-colors";
const schema = {
    "name":name,
    "dimension": 3,
    "metric": "dotproduct"
};

console.log("-------------------------------------------------------------------------");

/// Create the new collection with the name and schema
let create_result = await pinecone.create_collection(name,schema);
if (create_result.err) {
    console.error(`ERROR:  Couldn't create collection "${name}"!`);
    console.error(create_result.err);
} else {
    console.log(`Success! Collection "${name}" created!`);
    console.log(create_result.response);
}

//For a new collection, you need to wait until it's status is ready!
console.log(`Waiting for "${name}" to be ready...`);
let ready_result = await pinecone.wait_until_ready(name);
console.log(`Collection "${name}" is ready!`);

console.log("-------------------------------------------------------------------------");

/// Show the collection info as it exists in the pinecone engine
let collections_result = await pinecone.get_collections();
if (collections_result.err) {
    console.error(`ERROR:  Couldn't access collections!`);
    console.error(collections_result.err);
} else {
    console.log(`Collections found!"`);
    console.log(collections_result.response);
}
console.log("-------------------------------------------------------------------------");

/// Show the collection info as it exists in the pinecone engine
let collection_result = await pinecone.get_collection(name);
if (collection_result.err) {
    console.error(`ERROR:  Couldn't access collection "${name}"!`);
    console.error(collection_result.err);
} else {
    console.log(`Collection "${name} found!"`);
    console.log(collection_result.response);
}
console.log("-------------------------------------------------------------------------");

/// Upload some points - just five RGB colors
let points = [
    { "id": "colors-1", "metadata": {"color": "red"}, "values": [0.9, 0.1, 0.1] },
    { "id": "colors-2", "metadata": {"color": "green"}, "values": [0.1, 0.9, 0.1] },
    { "id": "colors-3", "metadata": {"color": "blue"}, "values": [0.1, 0.1, 0.9] },
    { "id": "colors-4", "metadata": {"color": "purple"}, "values": [1.0, 0.1, 0.9] },
    { "id": "colors-5", "metadata": {"color": "cyan"}, "values": [0.1, 0.9, 0.8] }
]
let upload_result = await pinecone.upload_points(name,points);
if (upload_result.err) {
    console.error(`ERROR:  Couldn't upload to "${name}"!`);
    console.error(upload_result.err);
} else {
    console.log(`Uploaded to "${name} successfully!"`);
    console.log(upload_result.response);
}

console.log("-------------------------------------------------------------------------");

/// Search the two closest colors (k=2)
let purplish = [0.8,0.1,0.7];
let search_result = await pinecone.search_collection(name,purplish,2);
if (search_result.err) {
    console.error(`ERROR: Couldn't search ${purplish}`);
    console.error(search_result.err);
} else {
    console.log(`Search results for ${purplish}`);
    console.log(JSON.stringify(search_result.response,null,2));
}

console.log("-------------------------------------------------------------------------");

/// Filtered search the closest color
let filter = {
    "color": {
        "$in": [
            "cyan",
        ]
    }
}
let filtered_result = await pinecone.search_collection(name,purplish,1,filter);
if (filtered_result.err) {
    console.error(`ERROR: Couldn't search ${purplish} with ${filter}`);
    console.error(filtered_result.err);
} else {
    console.log(`Search results for ${purplish} with ${filter}`);
    console.log(JSON.stringify(filtered_result.response,null,2));
}

console.log("-------------------------------------------------------------------------");

/// Delete the collection
let delete_result = await pinecone.delete_collection(name);
if (delete_result.err) {
    console.error(`ERROR:  Couldn't delete "${name}"!`);
    console.error(delete_result.err);
} else {
    console.log(`Deleted "${name} successfully!"`);
    console.log(delete_result.response);
}

console.log(`Waiting for ${name} to dissappear.`);
await pinecone.wait_until_deleted(name);
console.log('All gone!');