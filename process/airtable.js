var AIRTABLE_KEY = "keyUIdeexo613U2Nn";
let AIRTABLE_URL = "https://api.airtable.com/v0/appsLZAPESjpqzA3Z/Stats";
let STATS_RECORD = "recDeI3lBbnwQJhkG";
function getStats() {
    return JSON.parse(UrlFetchApp.fetch(AIRTABLE_URL + "/" + STATS_RECORD, {
        "method": "get",
        "headers": {
            Authorization: "Bearer " + AIRTABLE_KEY
        }
    }).getContentText())["fields"];
}

function updateStats(stats) {
    return UrlFetchApp.fetch(AIRTABLE_URL, {
        "method": "patch",
        "headers": {
            Authorization: "Bearer " + AIRTABLE_KEY,
            "Content-Type": "application/json"
        },
        "payload": JSON.stringify({
            "records": [
                {
                    "id": STATS_RECORD,
                    "fields": stats
                }
            ]
        })
    }).getContentText();
}