function makeTag(start, tag, attributes, startEnd) {
    var result = "";
    result += start ? "<" : (startEnd ? "/" : "</");
    result += tag;
    if (attributes) {
        result += Object.keys(attributes).reduce(function (previous, current) {
            var value = attributes[current];
            current = " " + current + "=\"" + value + "\"";
            return previous + current;
        }, "");
    }
    result += !startEnd ? ">" : (!start ? ">" : "");
    return result;
}

function makeStartSingleTag(tag, attributes) {
    return makeTag(true, tag, attributes, true);
}

function makeEndSingleTag(tag, attributes) {
    return makeTag(false, tag, attributes, true);
}

function makeStartTag(tag, attributes) {
    return makeTag(true, tag, attributes);
}

function makeEndTag(tag, attributes) {
    return makeTag(false, tag, attributes);
}

var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;'
};

function escapeHtml(string) {
    return String(string).replace(
        new RegExp("[&<>\"]", "g"), function (s) {
        return entityMap[s];
    });
}