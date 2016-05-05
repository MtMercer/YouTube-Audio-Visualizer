//receives a message and parse it to visualizer actions
window.addEventListener("message", function(event) {
    //we only accept messages from ourselves
    if (event.source != window)
        return;
    switch(event.data.action) {
        case "nextScene":
            vis.nextScene();
            break;
        case "previousScene":
            vis.previousScene();
            break;
        default:
            break;
    }
}, false);
