const functions = require('firebase-functions');
const express = require('express');
const firebase = require('firebase');

const app = express();

var config = {
    apiKey: "AIzaSyD6_v5q5Yuwki5-C9uBie551bEHTBtBNcY",
    databaseURL: "https://mtaa-cc329.firebaseio.com/",
    authDomain: "mtaa-cc329.firebaseapp.com"
};

firebase.initializeApp(config);

// Get a reference to the database service
var database = firebase.database();
var auth = firebase.auth();

app.get('/helloWorld', (request, response) => {
    writeUserData("0","1","2","3")
    response.status(200).json({ message : "Hello world"})
});

app.post('/user/register', (req, response) => {
    const { name, password, email } = req.body
     
    auth.fetchSignInMethodsForEmail(email).then(
        function(value) {        
            if (value.length > 0) 
            {
                response.status(400).json({ message : "Unable to register, email is allready in use" })
            }
            else 
            {
                auth.createUserWithEmailAndPassword(email, password).catch(function(error) {    
                    response.status(400).json({ 
                        message : error.message,
                        errorCode : error.code
                    })
                }).then(function(value) {
                    createNewUser(name, email, "customer", value.user.uid)
                    response.status(201).json({
                        message : "User was succesfully created",
                        userId : value.user.uid,
                    })
                });
            }
    });
});

app.post('/user/login', (req, response) => {
    const { password, email } = req.body
    
    auth.signInWithEmailAndPassword(email, password).then(
        function(value) {
            response.status(200).json({
                message : "User " + email + " succesfully signed in",
                userId : value.user.uid
            })
        }, 
        function(error){
            response.status(400).json({
                errorCode : error.code,
                message : error.message
            })
        });


});


function createNewUser(userName, email, role, id) 
{
    var newUserID = database.ref('users/' + id).set({
        username: userName,
        email: email,
        role : role,
        id : id,
    })
    return true;
}

function writeUserData(userId, name, email, imageUrl) {
    firebase.database().ref('users/' + userId).set({
      username: name,
      email: email,
      profile_picture : imageUrl
    });
  }

exports.app = functions.https.onRequest(app);

