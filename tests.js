//TODO: have tests in this repository
function allTests() {
    defaultTransforms();
    badList();
    headings();
    typicalDoc();
    lists();
    nestedLists();
    htmlEntities();
    complexDoc();
}

function defaultTransforms() {
    doTest(arguments.callee.name);
}

function complexDoc() {
    doTest(arguments.callee.name);
}

function badList() {
    doTest(arguments.callee.name);
}

function headings() {
    doTest(arguments.callee.name);
}

function typicalDoc() {
    doTest(arguments.callee.name);
}

function lists() {
    doTest(arguments.callee.name);
}

function nestedLists() {
    doTest(arguments.callee.name);
}

function htmlEntities() {
    doTest(arguments.callee.name);
}

function doTest(fileName) {
    var files = DriveApp.getFilesByName(fileName);
    var resultFiles = DriveApp.getFilesByName(fileName + "_result.txt")
    if (files.hasNext()) {
        var id = files.next().getId();
        var doc = DocumentApp.openById(id);
        var html = processDocument(doc, DEFAULT_SETTINGS);
        if (resultFiles.hasNext()) {
            var compare = resultFiles.next().getBlob().getDataAsString();
            var message;
            if (compare === html) {
                message = fileName + ": OK";
                console.log(message);
                Logger.log(message);
            } else {
                message = fileName + ": FAIL" + "\n" + "Expected: " + compare + "\n" + "Actual: " + html;
                console.log(message);
                Logger.log(message);
                throw new Error(message);
            }
        } else {
            DriveApp.getFoldersByName("G2HTML_TESTS").next().createFile(fileName + "_result.txt", html);
        }
    }
}