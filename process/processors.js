
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
    var numChildren = item.getNumChildren();
    return (numChildren > 0) ? makeStartTag(this.tag, this.attributes(item)) : "";
};
HeaderProcessor.prototype.end = function (item) {
    var numChildren = item.getNumChildren();
    return (numChildren > 0) ? makeEndTag(this.tag) : "";
};

function ParagraphProcessor(tag) {
    Processor.call(this, tag);
}

ParagraphProcessor.prototype = Object.create(Processor.prototype);
ParagraphProcessor.prototype.start = function (item, attrIndex) {
    var numChildren = item.getNumChildren();
    return (numChildren > 0 && this.options[OptionKeys.PARAGRAPHS]) ? makeStartTag(this.tag, this.attributes(item)) : "";
};
ParagraphProcessor.prototype.end = function (item) {
    var numChildren = item.getNumChildren();
    return (numChildren > 0 && this.options[OptionKeys.PARAGRAPHS]) ? makeEndTag(this.tag) : "";
};

function ListProcessor(tag) {
    Processor.call(this, tag);
}

ListProcessor.prototype = Object.create(Processor.prototype);
ListProcessor.prototype.start = function (item, attrIndex) {
    var previous = item.getPreviousSibling();
    var ordered = item.getGlyphType() === DocumentApp.GlyphType.NUMBER;
    var listTagName = ordered ? "ol" : "ul";
    var prefix = "";
    if (previous === null || previous.getType() !== DocumentApp.ElementType.LIST_ITEM) {
        prefix = "<"+listTagName+"><li>";
    } else if (previous.getNestingLevel() < item.getNestingLevel()) {
        for (var level = 0; level < item.getNestingLevel() - previous.getNestingLevel(); level++) {
            prefix += "<"+listTagName+"><li>";
        }
    } else {
        prefix = "<li>"
    }
    return prefix;
};
ListProcessor.prototype.end = function (item) {
    var next = item.getNextSibling();
    var ordered = item.getGlyphType() === DocumentApp.GlyphType.NUMBER;
    var listTagName = ordered ? "ol" : "ul";
    var suffix = "";
    if (next === null || next.getType() !== DocumentApp.ElementType.LIST_ITEM) {
        for (var level = 0; level < item.getNestingLevel() + 1; level++) {
            suffix += "</li></"+listTagName+">";
        }
    } else if (next.getNestingLevel() < item.getNestingLevel()) {
        for (var level = 0; level < item.getNestingLevel() - next.getNestingLevel(); level++) {
            suffix += "</li></"+listTagName+">";
        }
        suffix += "</li>";
    } else if (next.getNestingLevel() > item.getNestingLevel()) {
        suffix = "";
    } else {
        suffix = "</li>";
    }
    return suffix;
};

function ImageProcessor(tag) {
    Processor.call(this, tag);
}

ImageProcessor.prototype = Object.create(Processor.prototype);
ImageProcessor.prototype.attributes = function (item, attrIndex) {
    var attrs = {};
    try {
        var blob = item.getBlob();
        var link = item.getLinkUrl();
        var title = item.getAltTitle();
        var desc = item.getAltDescription();
        var alt = "";
        if (title) {
            alt = title;
        } else if (desc) {
            alt = desc;
        }
        if ((alt === "" || alt === null) && this.options[OptionKeys.IMAGE_ALTS]) {
            var position = this.document.newPosition(item.getParent(), 1);
            showMessage(this.document, position, "warning", "Alt missed");
        }
        var problematicLink = checkLink(link, this.options, this.document, item.getParent(), 1);

        if (problematicLink) {
            return attrs;
        }
        var res = getImageSize(blob);

        var imageWidth = (link.indexOf("@2x") !== -1 || this.options[OptionKeys.TRANSFORM_IMAGE_WIDTH]) ? res.width / 2 : res.width;
        var maxWidth = this.options[OptionKeys.MAX_IMAGE_WIDTH];
        if (maxWidth && imageWidth > maxWidth){
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
    var text = item.getText();
    var indices = item.getTextAttributeIndices();
    var templates = this.options.templates;
    var output = [];
    for (var i = 0; i < indices.length; i++) {
        var attrs = item.getAttributes(indices[i]);
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
            if (attrs[DocumentApp.Attribute.LINK_URL] && attrs[DocumentApp.Attribute.LINK_URL] != null && key == DocumentApp.Attribute.LINK_URL) {
                checkLink(attrs[key], this.options, this.document, item, startPos);
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
                var position = this.document.newPosition(item, idx);
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
                        if (matchAttributes[key] === attrs[key] || (matchAttributes[key] === true && attrs[key]) ) {
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
                var position = this.document.newPosition(item, idx);
                showMessage(this.document, position, "error", "2 or more spaces");
            }
        }

        if (this.options[OptionKeys.TBD]) {
            if (partText.toLowerCase().indexOf("tbd") !== -1) {
                var idx = startPos;
                var position = this.document.newPosition(item, idx);
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
TYPE_TAG_MAP[DocumentApp.ElementType.TABLE_ROW] = new Processor("tr");
TYPE_TAG_MAP[DocumentApp.ElementType.TABLE_CELL] = new Processor("td");
TYPE_TAG_MAP[DocumentApp.ElementType.TABLE] = new Processor("table");
TYPE_TAG_MAP[DocumentApp.ElementType.LIST_ITEM] = new ListProcessor("");
TYPE_TAG_MAP[DocumentApp.ElementType.INLINE_IMAGE] = new ImageProcessor("img");
TYPE_TAG_MAP[DocumentApp.ElementType.TEXT] = new TextProcessor("");

function lookahead(listItem, listId, depth) {
    var currentDepth = 0;
    var current = listItem;
    while (true) {
        var next = current.getNextSibling();
        if (next === null) {
            return false;
        } else if (next.getType() === DocumentApp.ElementType.LIST_ITEM && next.getListId() === listId) {
            return true;
        }
        if (next.getType() !== DocumentApp.ElementType.TEXT) {
            currentDepth++;
            if (currentDepth > depth) {
                break;
            }
        }
        current = next;
    }
    return false;
}

function processItem(doc, item, options) {
    var output = [];
    var prefix = "", suffix = "";

    var key = ""+item.getType();

    if (TYPE_TAG_MAP[key]) {
        var processor = TYPE_TAG_MAP[key];
        processor.options = options;
        processor.document = doc;
        prefix = processor.start(item);
        suffix = processor.end(item);
    }else{
        key = item.getType() + (item.getHeading ? "_" + item.getHeading() : "")

        if (TYPE_TAG_MAP[key]) {
            var processor = TYPE_TAG_MAP[key];
            processor.options = options;
            processor.document = doc;
            prefix = processor.start(item);
            suffix = processor.end(item);
        }
    }
    output.push(prefix);

    if (item.getNumChildren) {
        var numChildren = item.getNumChildren();
        for (var i = 0; i < numChildren; i++) {
            progress++;
            var child = item.getChild(i);
            if (child !== null) {
                output.push(processItem(doc, child, options));
            }
        }
    }
    output.push(suffix);
    return output.join('');
}

function processDocument(doc, options) {
    var body = doc.getBody();
    var numChildren = body.getNumChildren();
    total = calculateTotal(body);
    var output = [];
    clearBookmarks();
    for (var i = 0; i < numChildren; i++) {
        var child = body.getChild(i);
        if (child !== null) {
            output.push(processItem(doc, child, options));
        }
        progress++;
    }
    var html = output.join('\r');
    if (options[OptionKeys.PARAGRAPHS]) {
        html = html.replace(/(?:[\r\n\r\n]+)+/g, "\r\n");
    }
    return html;
}

function convert(settings) {
    var options = settings ? settings : loadSettings();
    var doc = DocumentApp.getActiveDocument();
    var html = processDocument(doc, options);
    var url = createDocumentForHtml(html, options);
    return renderResults(url, messages, options, html)
}

function createDocumentForHtml(html, options) {
    var name = DocumentApp.getActiveDocument().getName() + ".html";
    var folder;

    var folders = DriveApp.getFoldersByName(FOLDER_NAME);

    if (folders.hasNext()) {
        folder = folders.next();
        folder.setTrashed(true)
    }

    folder = DriveApp.createFolder(FOLDER_NAME);

    var newDoc = folder.createFile(name, html);

    return newDoc.getDownloadUrl().replace('&gd=true', '');
}

function generateId(item, options) {

    var id = item.getText();
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

function checkLink(link, options, doc, item, offset) {
    var position = doc.newPosition(item, offset);
    if ((link === null || link === "") && options[OptionKeys.EMPTY_LINKS]) {
        showMessage(doc, position, "error", "Link missed");
        return true;
    } else if (options[OptionKeys.FETCH_LINKS]) {
        try {
            if(link.indexOf("mailto") !== -1){
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
    return false;
}