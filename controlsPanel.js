function initControlsPanel() {
    const controlsPanel = document.getElementById('controls-panel');
    const toggleButton = document.getElementById('toggle-controls');

    const controlsPanelHidden = localStorage.getItem('controlsPanelHidden') === 'true';

    if (controlsPanelHidden) {
        controlsPanel.classList.add('hidden');
    }

    toggleButton.addEventListener('click', () => {
        controlsPanel.classList.toggle('hidden');

        localStorage.setItem('controlsPanelHidden', controlsPanel.classList.contains('hidden'));
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'h' || event.key === 'H') {
            controlsPanel.classList.toggle('hidden');

            localStorage.setItem('controlsPanelHidden', controlsPanel.classList.contains('hidden'));
        }
    });

    addKeyboardShortcutsSection(controlsPanel);
}

function addKeyboardShortcutsSection(controlsPanel) {
    const shortcutsSection = document.createElement('div');

    const heading = document.createElement('h3');
    heading.textContent = 'Keyboard Shortcuts';
    shortcutsSection.appendChild(heading);

    const shortcutsList = document.createElement('ul');

    const shortcuts = [
        { key: 'H', description: 'Toggle this controls panel' },
        { key: 'ESC', description: 'Cancel piece selection' }
    ];

    shortcuts.forEach(shortcut => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `<strong>${shortcut.key}:</strong> ${shortcut.description}`;
        shortcutsList.appendChild(listItem);
    });

    shortcutsSection.appendChild(shortcutsList);

    controlsPanel.appendChild(shortcutsSection);
}

export { initControlsPanel };
