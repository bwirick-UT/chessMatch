
function showNotification(message, type = 'info', duration = 0) {
    
    let notificationElement = document.getElementById('chess-notification');
    
    if (!notificationElement) {
        notificationElement = document.createElement('div');
        notificationElement.id = 'chess-notification';
        notificationElement.style.position = 'fixed';
        notificationElement.style.top = '50%';
        notificationElement.style.left = '50%';
        notificationElement.style.transform = 'translate(-50%, -50%)';
        notificationElement.style.padding = '20px';
        notificationElement.style.borderRadius = '10px';
        notificationElement.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
        notificationElement.style.zIndex = '2000';
        notificationElement.style.fontFamily = 'Arial, sans-serif';
        notificationElement.style.fontSize = '18px';
        notificationElement.style.textAlign = 'center';
        notificationElement.style.minWidth = '300px';
        notificationElement.style.maxWidth = '80%';
        
        
        const closeButton = document.createElement('button');
        closeButton.textContent = 'OK';
        closeButton.style.marginTop = '15px';
        closeButton.style.padding = '8px 16px';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontWeight = 'bold';
        
        closeButton.addEventListener('click', () => {
            document.body.removeChild(notificationElement);
        });
        
        document.body.appendChild(notificationElement);
    }
    
    switch (type) {
        case 'success':
            notificationElement.style.backgroundColor = '#4CAF50';
            notificationElement.style.color = 'white';
            break;
        case 'warning':
            notificationElement.style.backgroundColor = '#FF9800';
            notificationElement.style.color = 'white';
            break;
        case 'error':
            notificationElement.style.backgroundColor = '#F44336';
            notificationElement.style.color = 'white';
            break;
        case 'info':
        default:
            notificationElement.style.backgroundColor = '#2196F3';
            notificationElement.style.color = 'white';
            break;
    }
    
    notificationElement.innerHTML = `<div>${message}</div>`;
    
    const closeButton = document.createElement('button');
    closeButton.textContent = 'OK';
    closeButton.style.marginTop = '15px';
    closeButton.style.padding = '8px 16px';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '5px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.fontWeight = 'bold';
    closeButton.style.backgroundColor = 'white';
    closeButton.style.color = '#333';
    
    closeButton.addEventListener('click', () => {
        document.body.removeChild(notificationElement);
    });
    
    notificationElement.appendChild(closeButton);
    
    
    if (duration > 0) {
        setTimeout(() => {
            if (document.body.contains(notificationElement)) {
                document.body.removeChild(notificationElement);
            }
        }, duration);
    }
}

function showCheckNotification(player) {
    showNotification(`${player === 'w' ? 'White' : 'Black'} is in check!`, 'warning', 2000);
}

function showCheckmateNotification(winner) {
    showNotification(`Checkmate! ${winner === 'w' ? 'White' : 'Black'} wins!`, 'success');
}

function showStalemateNotification() {
    showNotification('Stalemate! The game is a draw.', 'info');
}

function showDrawNotification() {
    showNotification('Draw! The game is a draw.', 'info');
}

export { 
    showNotification, 
    showCheckNotification, 
    showCheckmateNotification, 
    showStalemateNotification, 
    showDrawNotification 
};
