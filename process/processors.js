function Processor(tag) {
    this.tag = tag;
    this.options = null;
    this.document = null;
}

Processor.prototype.attributes = function (item, index) {
    return {};
};
Processor.prototype.start = function (item, attrIndex) {
    return !skipStarted ?  makeStartTag(this.tag, this.attributes(item, attrIndex)) : "";
};
Processor.prototype.end = function (item) {
    return !skipStarted ? makeEndTag(this.tag) : "";
};

function HeaderProcessor(tag) {
    Processor.call(this, tag);
}

HeaderProcessor.prototype = Object.create(Processor.prototype);
HeaderProcessor.prototype.attributes = function (item, attrIndex) {
    if (this.options[OptionKeys.TITLE_CASE_HEADINGS]) {
        var text = item["text"]
        if (text !== text.toTitleCase()) {
            var properTitle = text.toTitleCase();
            var properTitleTokens = properTitle.split(" ");
            var titleTokens = text.split(" ");
            for (var i = 0; i < titleTokens.length; i++) {
                if (titleTokens[i] !== properTitleTokens[i]) {
                    showMessage(this.document, this.document.newPosition(item["real"], 0), "error", "Title: \"" + titleTokens[i] + "\" should be: \"" + properTitleTokens[i] + "\"");
                }
            }
            showMessage(this.document, this.document.newPosition(item["real"], 0), "error", "Title should be: " + properTitle);
        }
    }
    var id = generateId(item, this.options);
    return (!this.options[OptionKeys.HEADING_IDS] || id === null) ? null : {"id": id};
};
HeaderProcessor.prototype.start = function (item, attrIndex) {
    var numChildren = item["children"].length;
    if (numChildren > 0) {
        return !skipStarted ? makeStartTag(this.tag, this.attributes(item)) : "";
    } else {
        return "";
    }
};
HeaderProcessor.prototype.end = function (item) {
    var numChildren = item["children"].length;
    if (numChildren > 0) {
        return !skipStarted ? (makeEndTag(this.tag) + "\r") : "";
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
        for (var i = 0; i < numChildren; i++) {
            var child = item["children"][i];
            if (child !== null && child["text"]) {
                if (child["text"].indexOf("[html]") !== -1) {
                    htmlStarted = true;
                }
                if (child["text"].indexOf("[skip]") !== -1) {
                    skipStarted = true;
                }
            }
        }
        if (this.options[OptionKeys.PARAGRAPHS] && !htmlStarted && !skipStarted) {
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
        for (var i = 0; i < numChildren; i++) {
            var child = item["children"][i];
            if (child !== null && child["text"]) {
                if (child["text"].indexOf("[html]") !== -1) {
                    htmlStarted = true;
                }
                if (child["text"].indexOf("[skip]") !== -1) {
                    skipStarted = true;
                }
            }
        }
        if (this.options[OptionKeys.PARAGRAPHS] && !htmlStarted && !skipStarted) {
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
    return !skipStarted ?  "<" + prefix + ">\r" : "";
};
ListProcessor.prototype.end = function (item) {
    var firstItem = item["children"][0];
    var ordered = firstItem["glyph"] === DocumentApp.GlyphType.NUMBER;
    var suffix = ordered ? "ol" : "ul";
    return !skipStarted ?  "</" + suffix + ">\r" : "";
};

function ListItemProcessor(tag) {
    Processor.call(this, tag);
}

ListItemProcessor.prototype = Object.create(Processor.prototype);
ListItemProcessor.prototype.start = function (item, attrIndex) {
    return !skipStarted ?  "<li>" : "";
};
ListItemProcessor.prototype.end = function (item) {
    return !skipStarted ? "</li>\r" : "";
};

function ImageProcessor(tag) {
    Processor.call(this, tag);
}

ImageProcessor.prototype = Object.create(Processor.prototype);
ImageProcessor.prototype.attributes = function (item, attrIndex) {
    var attrs = {};
    var realItem = item["real"];
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
        Logger.log(e)
    }
    return attrs;
};
ImageProcessor.prototype.start = function (item, attrIndex) {
    if (!this.options[OptionKeys.GENERATE_IMAGES] || skipStarted) {
        return "";
    }
    return makeStartSingleTag(this.tag, this.attributes(item));
};
ImageProcessor.prototype.end = function (item) {
    if (!this.options[OptionKeys.GENERATE_IMAGES] || skipStarted) {
        return "";
    }
    return makeEndSingleTag("");
};

function TextProcessor(tag) {
    Processor.call(this, tag);
}

TextProcessor.prototype = Object.create(Processor.prototype);
TextProcessor.prototype.start = function (item, attrIndex) {
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
        if (partText.toLowerCase().indexOf("[skip]") !== -1) {
            skipStarted = true;
        }
        for (var key in attrs) {
            var processor = attrs[key] !== null ? TYPE_TAG_MAP[DocumentApp.ElementType.TEXT + "_" + key] : null;
            if (processor) {
                start += processor.start(item, indices[i]);
                end = processor.end(item) + end;
            }
            if (attrs[DocumentApp.Attribute.LINK_URL] && attrs[DocumentApp.Attribute.LINK_URL] !== null && key === ""+DocumentApp.Attribute.LINK_URL) {
                checkLink(attrs[key], this.options, this.document, item["real"], startPos);
            }
        }
        if (!skipStarted) {
            output.push(start);
        }
        //We escape HTML entities if and only if it's not a [html][/html] tag
        if (partText.toLowerCase().indexOf("[html]") !== -1) {
            htmlStarted = true;
        }

        if (this.options[OptionKeys.SHORTCUTS] && !skipStarted) {
            var shortcuts = new RegExp(SHORTCUTS, "g");
            var match;
            while ((match = shortcuts.exec(partText)) && attrs[DocumentApp.Attribute.FONT_FAMILY] !== "Consolas") {
                var idx = startPos + match.index;
                var position = this.document.newPosition(item["real"], idx);
                showMessage(this.document, position, "warning", "Shortcut without markup");
            }
        }
        if (this.options[OptionKeys.SPACES] && !htmlStarted && !skipStarted) {
            var patt = new RegExp("[ ]{2,}", "g");
            while (match = patt.exec(partText)) {
                var idx = startPos + match.index;
                var position = this.document.newPosition(item["real"], idx);
                showMessage(this.document, position, "error", "2 or more spaces");
            }
        }
        checkSimpleToken(this.document, partText, startPos, item, "\t","error", "TAB character can break HTML markup. Please, remove it (⌫⌫⏎ if it's a list).")
        if (this.options[OptionKeys.HYPHENS]) {
            checkSimpleToken(this.document, partText, startPos, item, " -", "warning", "Hyphen (-) instead of em-dash (—) (RU) or en-dash (–) (EN)")
        }
        if (this.options[OptionKeys.DASHES]) {
            checkSimpleToken(this.document, partText, startPos, item, " –", "warning", "En-dash (–) instead of em-dash (—) (RU only).")
        }

        if (this.options[OptionKeys.TBD]) {
            checkSimpleToken(this.document, partText.toLowerCase(), startPos, item, "tbd","warning", "Something should be done here")
        }

        if (!htmlStarted) {
            partText = escapeHtml(partText);
        }
        if (partText.toLowerCase().indexOf("[/html]") !== -1) {
            htmlStarted = false;
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
        if (!skipStarted) {
            output.push(partText);
        }

        if (!skipStarted) {
            output.push(end);
        }
        if (partText.toLowerCase().indexOf("[/skip]") !== -1) {
            skipStarted = false;
        }
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
var htmlStarted = false;
var skipStarted = false;

function addToList(list, child) {
    var targetLevel = child["level"];
    var targetIndent = child["indent"]

    var listItems = list["children"];
    var lastListItem = listItems[listItems.length - 1];
    var listLevel = lastListItem["level"];
    var listIndent = lastListItem["indent"];
    if (listLevel === targetLevel) {
        listItems.push(child);
    } else if (listIndent === targetIndent) {
        lastListItem["children"].push(child);
    } else {
        var listItemChilds = lastListItem["children"];
        var lastListChild = null;
        for (var i = 0; i < listItemChilds.length; i++) {
            var current = listItemChilds[i];
            if (current["type"] === "LIST") {
                lastListChild = current;
            }
        }
        if (lastListChild) {
            addToList(lastListChild, child);
        } else {
            var newList = {};
            newList["type"] = "LIST";
            newList["children"] = [];
            newList["children"].push(child);
            listItemChilds.push(newList);
        }
    }


}

function rebuildItem(doc, item, options, baseIndent) {
    var childs = [];
    var newItem = {};

    if (item.getType) {
        newItem["type"] = item.getType().toString();
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

    if (item.getHeading && item.getHeading() !== null) {
        newItem["heading"] = item.getHeading().toString();
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
    if (item.getIndentStart && item.getIndentStart() !== null) {
        newItem["indent"] = item.getIndentStart() - baseIndent;
    }
    if (item.getNumChildren || item.getRangeElements) {
        var numChildren = item.getRangeElements ? item.getRangeElements().length : item.getNumChildren();
        for (var i = 0; i < numChildren; i++) {
            var child = item.getRangeElements ? item.getRangeElements()[i].getElement() : item.getChild(i);
            if (child !== null) {
                var previous = child.getPreviousSibling()
                var childItem = rebuildItem(doc, child, options, baseIndent);
                if (child.getType() === DocumentApp.ElementType.LIST_ITEM) {
                    var listId = child.getListId();
                    lastListId = listId;
                    var listItems = listIndex[listId];
                    if (listItems) {
                        //recursively add
                        addToList(listItems, childItem);
                    } else {
                        var newList = {};
                        newList["type"] = "LIST";
                        newList["children"] = [];
                        newList["children"].push(childItem);
                        listIndex[listId] = newList;
                        childs.push(listIndex[listId]);
                    }
                } else if (child.getIndentStart && child.getIndentStart() !== null && (child.getIndentStart() - baseIndent) > 0 && previous !== null && (previous.getIndentStart() !== null && (previous.getIndentStart()-baseIndent > 0))) {
                    if (lastListId) {
                        var listItems = listIndex[lastListId];
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

    if (item["children"] && item["children"].length > 0) {
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

function updateStatistics(doc) {
    return; 
    
    if(MODE !== "release"){
        return;
    }
    let oldStats = getStats();
    var warnings = 0;
    var errors = 0;
    messages.forEach(function (message) {
        if (message.type === "warning") {
            warnings++;
        } else if (message.type === "error") {
            errors++;
        }
    });
    var stats = {
        "Words": oldStats["Words"] + countWords(doc.getText()),
        "Chars": oldStats["Chars"] + doc.getText().length,
        "Images": oldStats["Images"] + doc.getImages().length,
        "Documents": oldStats["Documents"] + 1,
        "Warnings": oldStats["Warnings"] + warnings,
        "Errors": oldStats["Errors"] + errors
    }
    updateStats(stats);
}

function processDocument(doc, options) {
    clearBookmarks();
    var selection = DocumentApp.getActiveDocument().getSelection();

    var baseIndent = 0;
    // This part looks like a hack, though it isn't. We need to somehow get the base indent - it looks like this approach works (at least it does not introduce regressions).
    if (doc.getBody() !== null) {
        var body = doc.getBody();
        var numberOfBodyChildren = body.getNumChildren();
        if (numberOfBodyChildren > 0) {
            var firstChild = body.getChild(0);
            if (firstChild.getIndentStart && firstChild.getIndentStart() !== null && firstChild.getIndentStart() > 0) {
                baseIndent = firstChild.getIndentStart();

                var position = doc.newPosition(body, 0);
                showMessage(doc, position, "warning", "It looks like this document has a custom indent. You'd better set it to zero - why do you need a bigger margin on the left at all?");
            }
        }
    }

    if (selection) {
        var body = rebuildItem(doc, selection, options, baseIndent);
        var html = processItem(doc, body, options).trim();
        updateStatistics(doc);
        return {
            html: html,
            json: JSON.stringify(body)
        }
    } else {
        checkTitle(doc, options);
        var body = rebuildItem(doc, doc.getBody(), options, baseIndent);
        var html = processItem(doc, body, options).trim();
        updateStatistics(doc);
        return {
            html: html,
            json: JSON.stringify(body)
        }
    }
}

function convert(settings) {
    var options = settings ? settings : loadSettings();
    var doc = DocumentApp.getActiveDocument();
    var html = processDocument(doc, options).html;
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

function checkSimpleToken(doc, partText, startPos, item, token, type, message) {
    var fromIndex = 0;
    if(skipStarted){
        return
    }
    while(true){
        var tokenIndex = partText.indexOf(token, fromIndex);
        if (tokenIndex !== -1) {
            fromIndex = tokenIndex+token.length+1;
            var idx = startPos + tokenIndex;
            var position = doc.newPosition(item["real"], idx);
            showMessage(doc, position, type, message);
        }else{
            break;
        }
    }
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
