const WebSocket = require('ws');
const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');

const wss = new WebSocket.Server({ port: 8888 });

let messages = [];
let users = {};
const usernamesFile = 'usernames.json';

function deleteUsernamesFile() {
    if (fs.existsSync(usernamesFile)) {
        fs.unlinkSync(usernamesFile);
    }
}

function loadUsernames() {
    if (fs.existsSync(usernamesFile)) {
        const data = fs.readFileSync(usernamesFile);
        users = JSON.parse(data);
    }
}

function saveUsernames() {
    fs.writeFileSync(usernamesFile, JSON.stringify(users));
}

deleteUsernamesFile();
loadUsernames();

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const messageData = JSON.parse(message);

        if (messageData.type === 'message') {
            messageData.timestamp = new Date().toLocaleTimeString();
            messages.push(messageData);
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(messageData));
                }
            });
        } else if (messageData.type === 'username') {
            const { username, uuid, color } = messageData;
            if (users[username] && users[username].uuid !== uuid) {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Username is already taken'
                }));
            } else {
                users[username] = { uuid: uuid, color: color };
                saveUsernames();
                ws.username = username;
                ws.color = color;
                ws.uuid = uuid;
                ws.send(JSON.stringify({
                    type: 'username-set'
                }));
                ws.send(JSON.stringify({
                    type: 'history',
                    messages: messages
                }));
            }
        } else if (messageData.type === 'color') {
            if (ws.username) {
                users[ws.username].color = messageData.color;
                saveUsernames();
            }
        }
    });

    ws.on('close', () => {
        if (ws.username) {
            // Do not delete the username on close, keep it persistent
        }
    });

    ws.send(JSON.stringify({
        type: 'history',
        messages: messages
    }));
});

console.log('WebSocket server is running on ws://localhost:8888');
