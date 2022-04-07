import { body_request, url_request } from "./request.js";

const base_url = "https://controller.us-west1-gcp.pinecone.io/";

const PineconeResponse = function(response) {
    this.err = response[0];
    this.response = response[1];
}

export const Pinecone = function(API_KEY,url){
    this.api_key = API_KEY;
    this.url = url||base_url;
    this.host = null;
};

//Handy for allowing Pinecone to do its thing and wait
export function sleep(ms) {
    ms = ms || 100; //default 100ms sleep time
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};


// Each collection/index has its own hostname.
// Before sending vectors and searching, you need to set the hostname
// This can be used manually or will be done when you call a host-specific method
Pinecone.prototype.set_host = async function (name) {
    let self = this;
    let collection_result = await this.get_collection(name);
    if (collection_result.err) {
        console.error(`ERROR:  Couldn't access collection "${name}"!`);
        console.error(collection_result.err);
    } else {
        self.host = `https://${collection_result.response.status.host}:${collection_result.response.status.port}/`;
        console.log(`Now using ${self.host}"`);
    }   
}

//
// When you create a collection, it might not be immediately ready
// This waits for the ready state to become true, without blocking the thread.
//
Pinecone.prototype.wait_until_ready = async function (name) {
    let self = this;
    let ready = false;
    while (!ready) {
        let collection_result = await self.get_collection(name);
        if (collection_result.err) {
            console.error(`ERROR:  Couldn't access collection "${name}"!`);
            console.error(collection_result.err);
            return collection_result;
        } else {
            ready = collection_result.response.status.ready
            //Give pinecone another 20ms to ready the index
            if(!ready) await sleep();
        }

    }
    return new PineconeResponse([null,'']);
}

//
// When you delete a collection, it might not be immediately removed
// This waits for the collection to dissappear, without blocking the thread
//
Pinecone.prototype.wait_until_deleted = async function (name) {
    let self = this;
    let ready = true;
    while(ready) {

        let collection_result = await self.get_collection(name);
        if (collection_result.err) {
            console.error(`Could no longer access collection "${name}"!`);
            ready = false;
        } else {
            //Give pinecone another 20ms to remove the index
            await sleep();
        }

        if(!ready) {
            return new PineconeResponse([null,'']);
        }
    }
}

// DELETE https://controller.us-west1-gcp.pinecone.io/databases
Pinecone.prototype.delete_collection = async function (name) {
    let api_key = this.api_key;
    let pinecone_url = this.url;
    let url = `${pinecone_url}databases/${name}`;
    return new PineconeResponse(await body_request(url,api_key,null,'DELETE'));
}

// POST https://controller.us-west1-gcp.pinecone.io/databases
Pinecone.prototype.create_collection = async function (name,body) {

    let collection_result = await this.get_collection(name);
    if (collection_result.err || !collection_result.result || !collection_result.database) {
        let api_key = this.api_key;
        let pinecone_url = this.url;
        let url = `${pinecone_url}databases`;
        return new PineconeResponse(await body_request(url,api_key,body,'POST'));
    } else {
        //Collection already exists 
        return new PineconeResponse([`Collection "${name}" already exists`,'']);
    }

}

//GET https://controller.us-west1-gcp.pinecone.io/databases
Pinecone.prototype.get_collections = async function () {
    let api_key = this.api_key;
    let pinecone_url = this.url;
    let url = `${pinecone_url}databases`;
    return new PineconeResponse(await url_request(url,api_key));
}


//GET https://controller.us-west1-gcp.pinecone.io/databases/{collection_name}
Pinecone.prototype.get_collection = async function (name) {
    let api_key = this.api_key;
    let pinecone_url = this.url;
    let url = `${pinecone_url}databases/${name}`;
    return new PineconeResponse(await url_request(url,api_key));
}

// 
// curl -i -X POST \
//   https://unknown-unknown.svc.unknown.pinecone.io/vectors/upsert \
//   -H 'Api-Key: YOUR_API_KEY_HERE' \
//   -H 'Content-Type: application/json' \
//   -d '{
//     "vectors": [
//       {
//         "id": "example-vector-1",
//         "values": [
//           0.1,
//           0.2,
//           0.3,
//           0.4,
//           0.5,
//           0.6,
//           0.7,
//           0.8
//         ],
//         "metadata": {
//           "genre": "documentary",
//           "year": 2019
//         }
//       }
//     ],
//     "namespace": "example-namespace"
//   }'
Pinecone.prototype.upload_points = async function (name,points) {
    if(!this.host) await this.set_host(name);
    let api_key = this.api_key;
    let pinecone_url = this.host;
    let url = `${pinecone_url}vectors/upsert`;
    return new PineconeResponse(await body_request(url,api_key,{namespace:name,vectors:points},'POST'));
}


// curl -i -X POST \
//   https://unknown-unknown.svc.unknown.pinecone.io/query \
//   -H 'Api-Key: YOUR_API_KEY_HERE' \
//   -H 'Content-Type: application/json' \
//   -d '{
//     "namespace": "example-namespace",
//     "topK": 10,
//     "filter": {
//       "genre": {
//         "$in": [
//           "comedy",
//           "documentary",
//           "drama"
//         ]
//       },
//       "year": {
//         "$eq": 2019
//       }
//     },
//     "includeValues": true,
//     "includeMetadata": true,
//     "queries": [
//       {
//         "values": [
//           0.1,
//           0.2,
//           0.3,
//           0.4,
//           0.5,
//           0.6,
//           0.7,
//           0.8
//         ],
//         "topK": 10,
//         "namespace": "example-namespace",
//         "filter": {
//           "genre": {
//             "$in": [
//               "comedy",
//               "documentary",
//               "drama"
//             ]
//           },
//           "year": {
//             "$eq": 2019
//           }
//         }
//       }
//     ]
//   }'
Pinecone.prototype.search_collection = async function (name,vector,k,filter) {
    k = k || 10;
    if(!this.host) await this.set_host(name);
    let api_key = this.api_key;
    let pinecone_url = this.host;
    let url = `${pinecone_url}query`;
    let query = {
      "namespace": name,
      "topK": k,
      "includeValues": false,
      "includeMetadata": true,
      "queries": [
        {
          "values": vector
        }
      ]
    };
    if (filter) {
        query.filter = filter;
        for(var i=0;i<query.queries.length;i++) {
            query.queries[i].filter = filter
        }
    }
    return new PineconeResponse(await body_request(url,api_key,query,'POST'));
}


//Same as search_collection but allows free-form query by the client
Pinecone.prototype.query_collection = async function (name,query) {
    if(!this.host) await this.set_host(name);   
    let api_key = this.api_key;
    let pinecone_url = this.host;
    let url = `${pinecone_url}query`;
    return new PineconeResponse(await body_request(url,api_key,query,'POST'));
}
