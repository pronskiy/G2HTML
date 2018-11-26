//TODO: have tests in this repository
function allTests() {
    defaultTransforms();
    complexDoc();
    badList();
    headings();
    typicalDoc();
    lists();
    nestedLists();
}

function defaultTransforms(){
    assertEqual(arguments.callee.name);
}
function complexDoc(){
    assertEqual(arguments.callee.name);
}
function badList(){
    assertEqual(arguments.callee.name);
}
function headings(){
    assertEqual(arguments.callee.name);
}
function typicalDoc(){
    assertEqual(arguments.callee.name);
}
function lists(){
    assertEqual(arguments.callee.name);
}
function nestedLists(){
    assertEqual(arguments.callee.name);
}

function assertEqual(fileName) {
    var files = DriveApp.getFilesByName(fileName);
    var resultFiles = DriveApp.getFilesByName(fileName + "_result.txt")
    if (files.hasNext()) {
        var id = files.next().getId();
        var doc = DocumentApp.openById(id);
        var html = processDocument(doc, DEFAULT_SETTINGS);
        if (resultFiles.hasNext()) {
            var compare = resultFiles.next().getBlob().getDataAsString();
            if (compare === html) {
                Logger.log(fileName + ": OK");
            } else {
                var message = fileName + ": FAIL" + "\n" + "Expected: " + compare + "\n" + "Actual: " + html;
                Logger.log(message);
                throw new Error(message);
            }
        }else{
            DriveApp.getFoldersByName("G2HTML_TESTS").next().createFile(fileName + "_result.txt", html);
        }
    }
}