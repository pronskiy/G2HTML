//TODO: have tests in this repository

var tests = [
    "defaultTransforms",
    "badList",
    "headings",
    "typicalDoc",
    "lists",
    "nestedLists",
    "htmlEntities",
    "complexDoc",
    "pureHTML"
];

function printAllTests(){
    return tests;
}

function allTests() {
    var result = "";
    for (var idx in tests) {
        result += doTest(tests[idx]);
    }
    return result;
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
                message = "✅ " + fileName + "\n";
                return message;
            } else {
                message = "❌ "+fileName + ": FAIL" + "\n" + "Expected: " + compare + "\n" + "Actual: " + html+"\n";
                return message;
            }
        } else {
            DriveApp.getFoldersByName("G2HTML_TESTS").next().createFile(fileName + "_result.txt", html);
            return "🛠 "+fileName+": DRY RUN\r\n"
        }
    }
}