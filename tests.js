function printAllTests(){
    return getAllTests();
}

function getAllTests(){
    var result = [];
    let files = DriveApp.getFoldersByName("G2HTML_TESTS").next().getFiles();
    while (files.hasNext()) {
        var file = files.next();
        var name = file.getName();
        if (!name.includes(".txt") && !name.includes(".json")) {
            result.push(name);
        }
    }
    return result.sort();
}

function allTests() {
    var result = "";
    let tests = getAllTests();
    for (var i in tests) {
        console.time("doTest")
        result += doTest(tests[i]);
        console.timeEnd("doTest")
    }
    return result;
}

function doTest(fileName) {
    var files = DriveApp.getFilesByName(fileName);
    var resultFiles = DriveApp.getFilesByName(fileName + "_result.txt")
    if (files.hasNext()) {
        let file = files.next();
        console.log(`Processing file: ${file.getName()}`);
        var id = file.getId();
        var doc = DocumentApp.openById(id);
        let result = processDocument(doc, loadSettings());
        var html = result.html;
        var jsonFiles = DriveApp.getFoldersByName("G2HTML_TESTS").next().getFilesByName(fileName + "_dump.json");
        if (jsonFiles.hasNext()) {
            var jsonFile = jsonFiles.next();
            console.log(`Trashing file ${jsonFile.getName()}`)
            jsonFile.setTrashed(true);
        }
        DriveApp.getFoldersByName("G2HTML_TESTS").next().createFile(fileName + "_dump.json", result.json);

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
        var html = processDocument(doc, settings).html;
        return "Default run finished";
    } else {
        return "Default test not found!";
    }
}