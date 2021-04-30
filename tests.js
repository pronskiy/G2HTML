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
    "pureHTML",
    "shortcuts"
];

function printAllTests(){
    return getAllTests();
}

function getAllTests(){
    var result = [];
    let files = DriveApp.getFoldersByName("G2HTML_TESTS").next().getFiles();
    while (files.hasNext()) {
        var file = files.next();
        var name = file.getName();
        if (!name.includes(".txt")) {
            result.push(name);
        }
    }
    return result;
}

function allTests() {
    var result = "";
    let tests = getAllTests();
    for (var i in tests){
        result += doTest(tests[i]);
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
                message = "❌ "+fileName +"\n";
                console.log(`Expected: ${compare.length}`)
                console.log(`Actual: ${html.length}`)
                return message;
            }
        } else {
            DriveApp.getFoldersByName("G2HTML_TESTS").next().createFile(fileName + "_result.txt", html);
            return "🛠"+fileName+": DRY RUN\r\n"
        }
    }
}

function defaultTest(){
    var files = DriveApp.getFilesByName("Custom Styles - test");
    if (files.hasNext()) {
        var id = files.next().getId();
        var doc = DocumentApp.openById(id);
        var settings = loadSettings();
        var html = processDocument(doc, settings);
        return "Default run finished";
    } else {
        return "Default test not found!";
    }
}