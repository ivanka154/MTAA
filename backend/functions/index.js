const functions = require('firebase-functions');
const express = require('express');
const firebase = require('firebase');
const func = require('./databaseFunctions');

const app = express();

var config = {
    apiKey: "AIzaSyD6_v5q5Yuwki5-C9uBie551bEHTBtBNcY",
    databaseURL: "https://mtaa-cc329.firebaseio.com/",
    authDomain: "mtaa-cc329.firebaseapp.com"
};

firebase.initializeApp(config);

// Get a reference to the database service
var auth = firebase.auth();

app.get('/helloWorld', (request, response) => {
    writeUserData("0","1","2","3")
    response.status(200).json({ message : "Hello world"})
});

app.post('/user/register', (req, res) => {
    const { name, password, email } = req.body
     
    auth.fetchSignInMethodsForEmail(email).then(
        function(value) {        
            if (value.length > 0) 
            {
                res.status(400).json({ message : "Unable to register, email is allready in use" })
            }
            else 
            {
                auth.createUserWithEmailAndPassword(email, password).catch(function(error) {    
                    res.status(400).json({ 
                        message : error.message,
                        errorCode : error.code
                    })
                }).then(function(value) {

                    func.createNewUser(value.user.uid, email, name, "customer").then(
                        function(newUser) {
                            res.status(201).json({
                                message : "User was succesfully created",
                                userId : newUser.id
                            })
                        },
                        function(error) {
                            res.status(400).json({ 
                                message : error.message,
                                errorCode : error.code
                            })
                        }
                    )
                });
            }
    });
});

app.post('/user/login', (req, res) => {
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

app.post('/order/createNew', (req, res) => {
    const { userId, restaurantId, tableId } = req.body;
    var isTableEmpty
    func.checkTableIfFree(restaurantId, tableId).then(function (value) {
        isTableEmpty = value
        console.log(isTableEmpty)
        if (isTableEmpty == true)
        {
            var v = func.createNewOrder(restaurantId, tableId, userId).then(function (value){
                console.log(value)
                res.status(201).json({ 
                    message : "New order was created",
                    order : value
                })
            }, function (error){
                console.log(error)
                res.status(500)
            });
        }
        else
        {
            res.status(403).json({
                order : isTableEmpty,
                message : "Table already has opened order."
            })
        }
    }, function (error){
        console.log(error)
        res.status(500)
    });
 })

app.post('/order/joinRequest', (req, res) => {
    const { userId, restaurantId, tableId, orderId } = req.body;
    if ( userId == null || restaurantId == null || tableId == null || orderId == null )
    {
        res.status(400).json({ message : "One of required parameters is missing : {userId, restaurantId, tableId, orderId}" })
        return;
    }

    func.getActiveUsersOnOrder(restaurantId, tableId, orderId, userId).then(function (value){
        if(value != null)
        {
            res.status(400).json({ message : "User is allready in order" });
            return 
        }
        else
        {
          func.createJoinTableRequest(restaurantId, tableId, userId, orderId).then(
            function(value) {
                res.status(200).json({
                    message : "New request for join table was created.",
                    request : value
                })
            },
            function(error) {
                res.status(400).json({
                    errorCode : error.code,
                    message : error.message
                })
            })  
        }
        
    }, function(error){
        res.status(500).json({ message : "Couldn't get yur request"})
    })
})

app.put('/order/addNewUser', (req, res) => {
    const { userId, orderId, requestId, restaurantId, tableId } = req.body;
    console.log(userId + " " + restaurantId + " " + tableId + " " + orderId)


    var joinRequest = func.getJoinRequest(restaurantId, tableId, requestId);
    if (joinRequest.aprover == userId)
    {
        func.addNewUserToOrder(joinRequest.requirer, orderId, requestId, restaurantId, tableId).then(
            function(value) {
                res.status(200).json({
                    message : "New user was added to order.",
                    order : value
                })
            },
            function(error) {
                res.status(400).json({
                    errorCode : error.code,
                    message : error.message
                })
            }
        );
    }

    
})

app.get('/restaurant/getMenu', (req, res) => {
    const { restaurantId } = req.body;
    if ( restaurantId == null ){
        res.status(400).json({ message : "Missing restaurantId" });
    }
    func.getMenu(restaurantId).then(function (value){
        if (value != null )
        {
            res.status(200).json({ menu : value.foods });
        }
        else
        {
            res.status(400).json({ message : "Bad restaurand Id, no restaurant with that Id exists" });
        }
    }, function(error){
        res.status(500).json({ message : "Couldn't get yur request"})
    }).catch(function (error) {
        res.status(500).json({ message : "Couldn't get yur request"})
    })
})

app.get('/restaurant/getFood', (req, res) => {
    const { restaurantId, foodId } = req.body;
    if ( restaurantId == null || restaurantId.length <= 0 || foodId == null || foodId.length <= 0 ){
        res.status(400).json({ message : "Missing restaurantId" });
        return
    }

    console.log(restaurantId + " " + foodId)
    func.getFood(restaurantId, foodId).then(function (value){
        if (value != null )
        {

            res.status(200).json( value );
        }
        else
        {
            func.getNumberOfFoodsInRestaurant(restaurantId).then(function (value) {
                if (value == null)
                {
                    res.status(400).json({ message : "Bad restaurand Id, no restaurant with that Id exists" });
                }
                else
                {
                    res.status(400).json({ message : "Bad food Id, restaurant has " + value + " items on menu" });
                }
            })
        }
    }, function(error){
        res.status(500).json({ message : "Couldn't get yur request"})
    }).catch(function (error) {
        res.status(500).json({ message : "Couldn't get yur request"})
    })
})

app.put('/order/addNewIdem', (req, res) => {
    
})

app.get('/order', (req, res) => {
    const { restaurantId, tableId, orderId, userId } = req.body;
    if ( restaurantId == null || tableId == null || orderId == null ){
        res.status(400).json({ message : "One of required parameters is missing : {restaurantId, tableId, orderId}" });
    }
    
        func.getOrder(restaurantId, tableId, orderId).then(function (value){
            if (value != null )
            {
                res.status(200).json( value );
            }
            else
            {
                res.status(400).json({ message : "Bad request, no order for input parameters" });
            }
        }, function(error){
            res.status(500).json({ message : "Couldn't get yur request"})
        }).catch(function (error) {
            res.status(500).json({ message : "Couldn't get yur request"})
        })
  

    
})

/*app.get('/order/allItems', (req, res) => {
    
})

app.get('/order/allItemsByUser', (req, res) => {
    
})

app.get('/order/getAllUsers', (req, res) => {
    
})

app.get('/order/itemToSend', (req, res) => {
    
})*/

app.post('/order/transferRequest', (req, res) => {
    
})

app.put('/odrer/acceptTransfer', (req, res) => {
    
})

app.post('/payment/', (req, res) => {
    
})

exports.app = functions.https.onRequest(app);

