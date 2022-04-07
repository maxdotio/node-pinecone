import fetch from "node-fetch";

export async function body_request(url,key,body,method){
    method = method || "POST";

    let fetch_spec = {
        method: method,
        headers: {
            'Api-Key': key,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    };

    if (body) fetch_spec.body = JSON.stringify(body);

    let response = await fetch(url, fetch_spec);
    let text = await response.text();

    if (response.status<400 && !text.length) {
        return [null,''];
    } else if (response.status>=400) {
        return [text,null];
    } else {
        try {
            const output = JSON.parse(text);
            return [null,output];
        } catch(ex) {
            const output = null;
            ex.service_response = text;
            return [ex,output];
        }
    }
}


export async function url_request(url,key,params){
    if (params) {
        url += "?" + new URLSearchParams(params).toString();
    }

    let fetch_spec = {
        method: 'GET',
        headers: {
            'Api-Key': key,
            'Accept': 'application/json'
        }
    };

    let response = await fetch(url, fetch_spec);

    try {
        const output = await response.json();
        return [null,output];
    } catch(ex) {
        const output = null;
        return [ex,output];
    }
}