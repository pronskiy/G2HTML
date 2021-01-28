var OptionKeys = {
    PARAGRAPHS: "paragraphs",
    HEADING_IDS: "heading_ids",
    GIFS: "gifs",
    GENERATE_IMAGES: "generate_images",
    FETCH_LINKS: "fetch_links",
    URL_TOKENS: "url_tokens",
    EMPTY_LINKS: "empty_links",
    IMAGE_ALTS: "image_alts",
    TRANSFORM_IMAGE_WIDTH: "transform_image_width",
    MAX_IMAGE_WIDTH:"max_image_width",
    SHORTCUTS:"shortcuts",
    TBD:"tbd",
    SPACES:"spaces"
};

var DEFAULT_SETTINGS = {
    "version": VERSION,
    "paragraphs": false,
    "heading_ids": true,
    "gifs": false,
    "generate_images": true,
    "fetch_links": false,
    "url_tokens": true,
    "empty_links": true,
    "image_alts": true,
    "tbd": true,
    "shortcuts":true,
    "spaces":true,
    "transform_image_width" : false,
    "max_image_width": "800",
    "idtemplates": [
        {
            "regexp" : "c\\+\\+",
            "replacement" : "cpp"
        },
        {
            "regexp" : "[0-9]",
            "replacement" : ""
        },
        {
            "regexp" : "[\\W_]+",
            "replacement" : " "
        },
        {
            "regexp" : "^\\s\\s*",
            "replacement" : ""
        },
        {
            "regexp" : "\\s\\s*$",
            "replacement" : ""
        },
        {
            "regexp" : "[\\W_]+",
            "replacement" : "_"
        }
    ],
    "templates": [
        {
            "attributes": {
                "FONT_FAMILY": "Consolas"
            },
            "replacement": "<code>$TEXT$</code>"
        },
        {
            "attributes": {
                "ITALIC": true
            },
            "replacement": "<em>$TEXT$</em>"
        },
        {
            "attributes": {
                "BOLD": true
            },
            "replacement": "<strong>$TEXT$</strong>"
        },
        {
            "attributes": {
                "STRIKETHROUGH": true
            },
            "replacement": "<strike>$TEXT$</strike>"
        },
        {
            "attributes": {
                "LINK_URL": true
            },
            "replacement": "<a href=\"LINK_URL\">$TEXT$</a>"
        },
        {
            "attributes": {
                "UNDERLINE" : true,
                "LINK_URL": null
            },
            "replacement": "<u>$TEXT$</u>"
        },
        {
            "regexp": "\\[d\\](.*)\\[\\/d\\]",
            "replacement": "<p><a class=\"jb-download-button\" href=\"some url\"><i class=\"download-icon\"></i>$1</a></p>"
        },
        {
            "regexp":  "\\[html\\](.*)",
            "replacement": "$1"
        },
        {
            "regexp":  "(.*)\\[\\/html\\]",
            "replacement": "$1"
        },
        {
            "regexp": "\\[e\\](.*)\\[\\/e\\]",
            "replacement": "<iframe width=\"560\" height=\"315\" src=\"$1\" frameborder=\"0\" allow=\"autoplay; encrypted-media\" allowfullscreen></iframe>"
        },
        {
            "regexp": "\\[more\\]",
            "replacement": "<!--more-->"
        }
    ]
};

function saveSettings(options) {
    var settingsFiles = DriveApp.getFilesByName(SETTINGS_STORAGE_NAME);
    if (!settingsFiles.hasNext()) {
        DriveApp.getRootFolder().createFile(SETTINGS_STORAGE_NAME, JSON.stringify(DEFAULT_SETTINGS));
        settingsFiles = DriveApp.getFilesByName(SETTINGS_STORAGE_NAME);
    }
    var file = settingsFiles.next();
    file.setContent(JSON.stringify(options));
}

function loadSettings() {
    var settingsFiles = DriveApp.getFilesByName(SETTINGS_STORAGE_NAME);
    if (!settingsFiles.hasNext()) {
        DriveApp.getRootFolder().createFile(SETTINGS_STORAGE_NAME, JSON.stringify(DEFAULT_SETTINGS));
        settingsFiles = DriveApp.getFilesByName(SETTINGS_STORAGE_NAME);
    }
    var text = settingsFiles.next().getBlob().getDataAsString();
    var settings = JSON.parse(text);
    return settings;
}