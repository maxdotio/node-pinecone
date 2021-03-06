# node-pinecone

Javascript client for the Pinecone.io vector search engine (https://pinecone.io)

## Install

`npm install pinecone-io`

Then you can use it in your project:

```javascript
import { Pinecone } from "pinecone-io"
const pinecone = new Pinecone(process.env.PINECONE_API_KEY);
```

## Quick Start

___You must create a Pinecone.io account and obtain an API key first!___

Here is a basic example that creates a client connection and adds a new collection `pretty_colors` to Pinecone.  This quick start is also in the examples folder in this repository.

With your API key, you can run the quick_start code like this, by setting the PINECONE_API_KEY environment variable:
```bash
PINECONE_API_KEY=********-****-****-****-************ node quick_start.js
```

```javascript
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
```

## Conventions

This API, for general consistency with other Search Engines, uses the terminology of a `collection` to refer to a database, index, or namespace.  A collection has a name and a schema.

Collection management operations are performed against the URL of a pod.  Vector and Search operations are performed against the url of the collection host.

All methods must be awaited, and each returns a PineconeResponse object - which only has two properties: `err` and `response`.

Always check for presence of `err`.  If `err` is not null, then the response might not be valid. When in doubt, copy the example code from above for the appropriate method.

## Collection methods

With a `pinecone` object, just await one of the following methods to interact with the engine and its collections.

### `create_collection(name,body)`

Creates a new collection with `name` and the schema specified in `body`

### `get_collections()`

Gets all the collections that are accessible by the API key.

### `get_collection(name)`

Gets the collection information for `name`

### `delete_collection(name)`

Deletes a collection with `name`

### `wait_until_ready(name)`

When you create a collection, it might not be immediately ready.  This waits for the ready state to become true, without blocking the thread.

If you use create_collection you should immediately follow it with this method, to make sure you don't try to use a collection before it's ready!

### `wait_until_deleted(name)`

When you delete a collection, it might not be immediately removed.  This waits for the collection to dissappear, without blocking the thread.

## Vector and Search operations

With a `pinecone` object, just await one of the following methods to interact with the engine and its collections.

___Important! you should not use the same pinecone object to search different collections.  If you need to search multiple collections, create a pinecone object for each collection.___

Each of these operations will ensure an appropriate host is being used.  This is leaky, since it sets the host in the pinecone object as a side effect.  But it's convenient :)

### `upload_points(name,points)`

Uploads vectors and payloads in `points` to the collection `name`

### `search_collection(name,vector,k,filter)`

Searches the collection with a `vector`, to get the top `k` most similar points (default 5), and an optional metadata filter.

### `query_collection(name,query)`

Searches the collection with a Pinecone compatible `query` that must be fully defined by the caller.