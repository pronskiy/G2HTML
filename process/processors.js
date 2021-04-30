function Processor(tag) {
    this.tag = tag;
    this.options = null;
    this.document = null;
}

Processor.prototype.attributes = function (item, index) {
    return {};
};
Processor.prototype.start = function (item, attrIndex) {
    return makeStartTag(this.tag, this.attributes(item, attrIndex));
};
Processor.prototype.end = function (item) {
    return makeEndTag(this.tag);
};

function HeaderProcessor(tag) {
    Processor.call(this, tag);
}

HeaderProcessor.prototype = Object.create(Processor.prototype);
HeaderProcessor.prototype.attributes = function (item, attrIndex) {
    var id = generateId(item, this.options);
    return (!this.options[OptionKeys.HEADING_IDS] || id === null) ? null : {"id": id};
};
HeaderProcessor.prototype.start = function (item, attrIndex) {
    var numChildren = item["children"].length;
    if (numChildren > 0) {
        return makeStartTag(this.tag, this.attributes(item))
    } else {
        return "";
    }
};
HeaderProcessor.prototype.end = function (item) {
    var numChildren = item["children"].length;
    if (numChildren > 0) {
        return makeEndTag(this.tag) + "\r"
    } else {
        return "\r";
    }
};

function ParagraphProcessor(tag) {
    Processor.call(this, tag);
}

ParagraphProcessor.prototype = Object.create(Processor.prototype);
ParagraphProcessor.prototype.start = function (item, attrIndex) {
    var numChildren = item["children"].length;
    if (numChildren > 0) {
        if (this.options[OptionKeys.PARAGRAPHS] && !htmlStarted) {
            return makeStartTag(this.tag, this.attributes(item))
        } else {
            return "";
        }
    } else {
        return "";
    }
};
ParagraphProcessor.prototype.end = function (item) {
    var numChildren = item["children"].length;
    if (numChildren > 0) {
        if (this.options[OptionKeys.PARAGRAPHS] && !htmlStarted) {
            return makeEndTag(this.tag) + "\r"
        } else {
            return "\r";
        }
    } else {
        return "\r";
    }
};

function ListProcessor(tag) {
    Processor.call(this, tag);
}

ListProcessor.prototype = Object.create(Processor.prototype);
ListProcessor.prototype.start = function (item, attrIndex) {
    var firstItem = item["children"][0];
    var ordered = firstItem["glyph"] === DocumentApp.GlyphType.NUMBER;
    var prefix = ordered ? "ol" : "ul";
    return "<" + prefix + ">\r";
};
ListProcessor.prototype.end = function (item) {
    var firstItem = item["children"][0];
    var ordered = firstItem["glyph"] === DocumentApp.GlyphType.NUMBER;
    var suffix = ordered ? "ol" : "ul";
    return "</" + suffix + ">";
};

function ListItemProcessor(tag) {
    Processor.call(this, tag);
}

ListItemProcessor.prototype = Object.create(Processor.prototype);
ListItemProcessor.prototype.start = function (item, attrIndex) {
    return "<li>";
};
ListItemProcessor.prototype.end = function (item) {
    return "</li>\r";
};

function ImageProcessor(tag) {
    Processor.call(this, tag);
}

ImageProcessor.prototype = Object.create(Processor.prototype);
ImageProcessor.prototype.attributes = function (item, attrIndex) {
    var attrs = {};
    let realItem = item["real"];
    try {
        var blob = realItem.getBlob();
        var link = item["href"];
        var alt = item["alt"];
        if (!alt) {
            alt = "";
        }
        if ((alt === "" || alt === null) && this.options[OptionKeys.IMAGE_ALTS]) {
            var position = this.document.newPosition(realItem.getParent(), 1);
            showMessage(this.document, position, "warning", "Alt missed");
        }
        var problematicLink = checkLink(link, this.options, this.document, realItem.getParent(), 1);

        if (problematicLink) {
            return attrs;
        }
        var res = getImageSize(blob);

        var imageWidth = (link.indexOf("@2x") !== -1 || this.options[OptionKeys.TRANSFORM_IMAGE_WIDTH]) ? res.width / 2 : res.width;
        var maxWidth = this.options[OptionKeys.MAX_IMAGE_WIDTH];
        if (maxWidth && imageWidth > maxWidth) {
            imageWidth = maxWidth;
        }
        var gif = link && link.indexOf(".gif") !== -1;
        attrs["alt"] = alt;
        attrs["width"] = imageWidth;
        if (gif && this.options[OptionKeys.GIFS]) {
            attrs["data-gif-src"] = link;
            attrs["src"] = link.replace(".gif", ".png");
        } else {
            attrs["src"] = link;
        }
    } catch (e) {
        console.log(`doc title: ${this.document.getName()}`)
        Logger.log(e)
    }
    return attrs;
};
ImageProcessor.prototype.start = function (item, attrIndex) {
    if (!this.options[OptionKeys.GENERATE_IMAGES]) {
        return "";
    }
    return makeStartSingleTag(this.tag, this.attributes(item));
};
ImageProcessor.prototype.end = function (item) {
    if (!this.options[OptionKeys.GENERATE_IMAGES]) {
        return "";
    }
    return makeEndSingleTag("");
};

function TextProcessor(tag) {
    Processor.call(this, tag);
}

var htmlStarted = false;

TextProcessor.prototype = Object.create(Processor.prototype);
TextProcessor.prototype.start = function (item, attrIndex) {
    // console.log("text item: " + JSON.stringify(item));
    var text = item["text"];
    var indices = item["attribute_indices"];
    var templates = this.options.templates;
    var output = [];
    for (var i = 0; i < indices.length; i++) {
        var attrs = item["attributes"][i];
        var startPos = indices[i];
        var endPos = i + 1 < indices.length ? indices[i + 1] : text.length;
        var partText = text.substring(startPos, endPos);
        var start = "";
        var end = "";

        for (var key in attrs) {
            var processor = attrs[key] !== null ? TYPE_TAG_MAP[DocumentApp.ElementType.TEXT + "_" + key] : null;
            if (processor) {
                start += processor.start(item, indices[i]);
                end = processor.end(item) + end;
            }
            if (attrs[DocumentApp.Attribute.LINK_URL] && attrs[DocumentApp.Attribute.LINK_URL] != null && key === DocumentApp.Attribute.LINK_URL) {
                checkLink(attrs[key], this.options, this.document, item["real"], startPos);
            }
        }
        output.push(start);
        //We escape HTML entities if and only if it's not a [html][/html] tag
        if (partText.toLowerCase().indexOf("[html]") !== -1) {
            htmlStarted = true;
        }
        if (!htmlStarted) {
            partText = escapeHtml(partText);
        }
        if (partText.toLowerCase().indexOf("[/html]") !== -1) {
            htmlStarted = false;
        }
        var match;

        if (this.options[OptionKeys.SHORTCUTS]) {
            var shortcuts = new RegExp(SHORTCUTS, "g");

            while ((match = shortcuts.exec(partText)) && attrs[DocumentApp.Attribute.FONT_FAMILY] !== "Consolas") {
                var idx = startPos + match.index;
                var position = this.document.newPosition(item["real"], idx);
                showMessage(this.document, position, "warning", "Shortcut without markup");
            }
        }


        if (templates) {
            for (var index in templates) {
                var tpl = templates[index];
                if (tpl.regexp) {
                    var fixedReplacement = tpl.replacement;
                    for (key in attrs) {
                        if (attrs[key] && attrs[key] !== null) {
                            fixedReplacement = fixedReplacement.replace(key, attrs[key]);
                        }
                    }
                    partText = partText.replace(new RegExp(tpl.regexp, "g"), fixedReplacement);
                } else {
                    var matchAttributes = tpl.attributes;
                    var countMatched = 0;
                    for (var key in tpl.attributes) {
                        if (matchAttributes[key] === attrs[key] || (matchAttributes[key] === true && attrs[key])) {
                            countMatched++;
                        }
                    }
                    if (countMatched === Object.keys(matchAttributes).length) {
                        var fixedReplacement = tpl.replacement;
                        for (key in attrs) {
                            if (attrs[key] && attrs[key] !== null) {
                                fixedReplacement = fixedReplacement.replace(key, attrs[key]);
                            }
                        }
                        partText = fixedReplacement.replace("$TEXT$", partText);
                    }
                }

            }
        }
        output.push(partText);

        if (this.options[OptionKeys.SPACES] && !htmlStarted) {
            var patt = new RegExp("[ ]{2,}", "g");
            while (match = patt.exec(partText)) {
                var idx = startPos + match.index;
                var position = this.document.newPosition(item["real"], idx);
                showMessage(this.document, position, "error", "2 or more spaces");
            }
        }
        if (partText.includes("\t")) {
            var idx = startPos + partText.indexOf("\t");
            var position = this.document.newPosition(item["real"], idx);
            showMessage(this.document, position, "error", "TAB character == broken formatting");
        }

        if (this.options[OptionKeys.TBD]) {
            if (partText.toLowerCase().indexOf("tbd") !== -1) {
                var position = this.document.newPosition(item["real"], startPos);
                showMessage(this.document, position, "warning", "Something should be done here");
            }
        }

        output.push(end);
    }
    return output.join('');
};
TextProcessor.prototype.end = function (item) {
    return "";
};

var TYPE_TAG_MAP = {};
TYPE_TAG_MAP[DocumentApp.ElementType.PARAGRAPH + "_" + DocumentApp.ParagraphHeading.NORMAL] = new ParagraphProcessor("p");
TYPE_TAG_MAP[DocumentApp.ElementType.PARAGRAPH + "_" + DocumentApp.ParagraphHeading.HEADING1] = new HeaderProcessor("h1");
TYPE_TAG_MAP[DocumentApp.ElementType.PARAGRAPH + "_" + DocumentApp.ParagraphHeading.HEADING2] = new HeaderProcessor("h2");
TYPE_TAG_MAP[DocumentApp.ElementType.PARAGRAPH + "_" + DocumentApp.ParagraphHeading.HEADING3] = new HeaderProcessor("h3");
TYPE_TAG_MAP[DocumentApp.ElementType.PARAGRAPH + "_" + DocumentApp.ParagraphHeading.HEADING4] = new HeaderProcessor("h4");
TYPE_TAG_MAP[DocumentApp.ElementType.PARAGRAPH + "_" + DocumentApp.ParagraphHeading.HEADING5] = new HeaderProcessor("h5");
TYPE_TAG_MAP[DocumentApp.ElementType.PARAGRAPH + "_" + DocumentApp.ParagraphHeading.HEADING6] = new HeaderProcessor("h6");
TYPE_TAG_MAP[DocumentApp.ElementType.PARAGRAPH + "_" + DocumentApp.ParagraphHeading.SUBTITLE] = new HeaderProcessor("h2");
TYPE_TAG_MAP[DocumentApp.ElementType.PARAGRAPH + "_" + DocumentApp.ParagraphHeading.TITLE] = new HeaderProcessor("h1");
TYPE_TAG_MAP[DocumentApp.ElementType.TABLE_ROW] = new Processor("tr");
TYPE_TAG_MAP[DocumentApp.ElementType.TABLE_CELL] = new Processor("td");
TYPE_TAG_MAP[DocumentApp.ElementType.TABLE] = new Processor("table");
TYPE_TAG_MAP[DocumentApp.ElementType.LIST_ITEM] = new ListItemProcessor("");
TYPE_TAG_MAP["LIST"] = new ListProcessor("");
TYPE_TAG_MAP[DocumentApp.ElementType.INLINE_IMAGE] = new ImageProcessor("img");
TYPE_TAG_MAP[DocumentApp.ElementType.TEXT] = new TextProcessor("");

var listIndex = {};
var lastListId = null;
function addToList(list, child) {
    var targetLevel = child["level"];
    var targetIndent = child["indent"]

    var listItems = list["children"];
    var lastListItem = listItems[listItems.length - 1];
    var listLevel = lastListItem["level"];
    var listIndent = lastListItem["indent"];
    if (listLevel === targetLevel) {
        // console.log("Target level is same, add");
        listItems.push(child);
    } else if (listIndent === targetIndent) {
        lastListItem["children"].push(child);
    } else {
        var listItemChilds = lastListItem["children"];
        var lastListChild = null;
        for (var i = 0; i < listItemChilds.length; i++) {
            let current = listItemChilds[i];
            if (current["type"] === "LIST") {
                lastListChild = current;
            }
        }
        // console.log("Child: " + JSON.stringify(child));
        // console.log("Last list child: " + JSON.stringify(lastListChild));
        // console.log("Target level " + targetLevel);

        if (lastListChild) {
            // console.log("Target level is not same, recursive");
            addToList(lastListChild, child);
        } else {
            // console.log("No childs, just add");
            var newList = {};
            newList["type"] = "LIST";
            newList["children"] = [];
            newList["children"].push(child);
            listItemChilds.push(newList);
        }
    }


}

//listIndex[listId][level][lastItem]
function rebuildItem(doc, item, options) {
    var childs = [];
    var newItem = {};

    if (item.getType) {
        newItem["type"] = item.getType();
    }
    if (item.getText && item.getType() !== DocumentApp.ElementType.BODY_SECTION) {
        newItem["text"] = item.getText();
    }
    if (item.getListId) {
        newItem["listId"] = item.getListId();
    }
    if (item.getNestingLevel) {
        newItem["level"] = item.getNestingLevel();
    }

    if (item.getGlyphType) {
        newItem["glyph"] = item.getGlyphType();
    }

    if (item.getIndentStart && item.getIndentStart() !== null) {
        newItem["indent"] = item.getIndentStart();
    }

    if (item.getHeading && item.getHeading() !== null) {
        newItem["heading"] = item.getHeading();
    }
    if (item.getLinkUrl) {
        newItem["href"] = item.getLinkUrl();
    }
    if (item.getAltTitle) {
        if (item.getAltTitle()) {
            newItem["alt"] = item.getAltTitle();
        } else {
            if (item.getAltDescription) {
                if (item.getAltDescription()) {
                    newItem["alt"] = item.getAltDescription();
                }
            }
        }
    }

    if (item.getTextAttributeIndices && item.getTextAttributeIndices() !== null) {
        newItem["attribute_indices"] = item.getTextAttributeIndices();
        var attributes = [];
        for (var i = 0; i < newItem["attribute_indices"].length; i++) {
            attributes.push(item.getAttributes(newItem["attribute_indices"][i]))
        }
        newItem["attributes"] = attributes;
    }
    // if (item.getAttributes && item.getAttributes() !== null) {
    //     newItem["attributes"] = item.getAttributes();
    // }

    if (item.getNumChildren) {
        var numChildren = item.getNumChildren();
        for (var i = 0; i < numChildren; i++) {
            var child = item.getChild(i);
            if (child !== null) {
                var childItem = rebuildItem(doc, child, options);
                if (child.getType() === DocumentApp.ElementType.LIST_ITEM) {
                    let listId = child.getListId();
                    lastListId = listId;
                    let listItems = listIndex[listId];
                    if (listItems) {
                        //recursively add
                        addToList(listItems, childItem);
                    } else {
                        // console.log("create new list");
                        var newList = {};
                        newList["type"] = "LIST";
                        newList["children"] = [];
                        newList["children"].push(childItem);
                        listIndex[listId] = newList;
                        childs.push(listIndex[listId]);
                    }
                } else if (child.getIndentStart && child.getIndentStart() !== null && child.getIndentStart() !== 0) {
                    if (lastListId) {
                        // console.log("suspicious child: " + JSON.stringify(childItem));
                        let listItems = listIndex[lastListId];
                        addToList(listItems, childItem);
                    } else {
                        childs.push(childItem);
                    }
                } else {
                    childs.push(childItem);
                }
            }
        }
    }
    newItem["children"] = childs;
    newItem["real"] = item;
    return newItem;
}


function processItem(doc, item, options) {
    var output = [];
    var prefix = "", suffix = "";

    var key = "" + item["type"];
    if (TYPE_TAG_MAP[key]) {
        var processor = TYPE_TAG_MAP[key];
        processor.options = options;
        processor.document = doc;
        prefix = processor.start(item);
        suffix = processor.end(item);
    } else {
        key = item["type"] + (item["heading"] ? "_" + item["heading"] : "")

        if (TYPE_TAG_MAP[key]) {
            var processor = TYPE_TAG_MAP[key];
            processor.options = options;
            processor.document = doc;
            prefix = processor.start(item);
            suffix = processor.end(item);
        }
    }
    output.push(prefix);

    if (item["children"].length > 0) {
        var numChildren = item["children"].length;
        for (var i = 0; i < numChildren; i++) {
            var child = item["children"][i];
            if (child !== null) {
                output.push(processItem(doc, child, options));
            }
        }
    }
    output.push(suffix);
    return output.join('');
}

function processDocument(doc, options) {
    // var output = [];

    checkTitle(doc, options);
    clearBookmarks();
    var body = doc.getBody();

    var newBody = rebuildItem(doc, body, options);
    console.log(JSON.stringify(newBody));
    return processItem(doc, newBody, options).trimEnd();
}

function convert(settings) {
    var options = settings ? settings : loadSettings();
    var doc = DocumentApp.getActiveDocument();
    var html = processDocument(doc, options);
    return renderResults(messages, options, html)
}

function generateId(item, options) {
    var id = item["text"];
    if (id === null) {
        return;
    }
    id = id.toLowerCase();
    for (var index in options.idtemplates) {
        var tpl = options.idtemplates[index];
        id = id.replace(new RegExp(tpl.regexp, "g"), tpl.replacement);
    }
    return id;
}

function showMessage(doc, position, type, message) {
    var bookmark = doc.addBookmark(position);
    messages.push({
        "type": type,
        "id": bookmark.getId(),
        "text": message
    });
}

function checkTitle(doc, options) {
    var title = doc.getName();
    var zeroPosition = doc.newPosition(doc.getBody(), 0);
    var match;
    if (options[OptionKeys.SPACES]) {
        var patt = new RegExp("[ ]{2,}", "g");
        while (match = patt.exec(title)) {
            showMessage(doc, zeroPosition, "error", "2 or more spaces in title");
        }
    }
    if (options[OptionKeys.TITLE_CASE]) {
        if (title !== title.toTitleCase()) {
            var properTitle = title.toTitleCase();
            var properTitleTokens = properTitle.split(" ");
            var titleTokens = title.split(" ");
            for (var i = 0; i < titleTokens.length; i++) {
                if (titleTokens[i] !== properTitleTokens[i]) {
                    showMessage(doc, zeroPosition, "error", "Title: \"" + titleTokens[i] + "\" should be: \"" + properTitleTokens[i] + "\"");
                }
            }
            showMessage(doc, zeroPosition, "error", "Title should be: " + properTitle);
        }
    }
}

function checkLink(link, options, doc, item, offset) {
    var position = doc.newPosition(item, offset);
    if ((link === null || link === "") && options[OptionKeys.EMPTY_LINKS]) {
        showMessage(doc, position, "error", "Link missed");
        return true;
    } else {
        if (options[OptionKeys.FETCH_LINKS]) {
            try {
                if (link.indexOf("mailto") !== -1) {
                    return false;
                }
                var response = UrlFetchApp.fetch(link, {"muteHttpExceptions": true});
                if (response.getResponseCode() !== 200) {
                    showMessage(doc, position, "error", "Wrong link, response code: " + response.getResponseCode());
                    return true;
                }
            } catch (e) {
                showMessage(doc, position, "error", "Wrong link, error: " + e.message);
                return true;
            }
        }
        if (options[OptionKeys.URL_TOKENS]) {
            var regexp = new RegExp(URL_TOKENS, "g");
            if (regexp.exec(link)) {
                showMessage(doc, position, "warning", "Marketing token in link");
            }
        }
    }
    return false;
}