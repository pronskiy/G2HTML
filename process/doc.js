
function setCursor(id) {
    var doc = DocumentApp.getActiveDocument();
    var bookmark = doc.getBookmark(id);
    if (bookmark) {
        doc.setCursor(bookmark.getPosition());
    }
}

function clearBookmarks() {
    var doc = DocumentApp.getActiveDocument();
    var bookmarks = doc.getBookmarks();
    for (var i in bookmarks) {
        var bookmark = bookmarks[i];
        //TODO: submit this bug to Google
        try {
            bookmark.remove();
        } catch (e) {
        }
    }
}
function countWords(text){
    let removeChar = text.replace(/[^A-Za-z]\s+/g, " ");
    let newWord = removeChar.trim().split(" ");
    return newWord.length;
}