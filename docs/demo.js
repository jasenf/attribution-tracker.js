const tracker = new AttributionTracker({
    consent: true,
    useSessionStorage: true,
    storageKey: 'attribution_tracker_demo'
});

const output = document.querySelector('#output');
const clearButton = document.querySelector('#clear');
const exampleLinks = document.querySelectorAll('.links a');

function render() {
    output.textContent = JSON.stringify(tracker.getAll() || {
        message: 'No attribution is stored. Try one of the example links.'
    }, null, 2);
}

clearButton.addEventListener('click', () => {
    tracker.clear();
    render();
});

for (const link of exampleLinks) {
    link.addEventListener('click', (event) => {
        event.preventDefault();
        tracker.clear();
        window.location.assign(link.href);
    });
}

render();
