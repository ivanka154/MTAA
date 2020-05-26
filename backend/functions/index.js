const functions = require('firebase-functions');
const express = require('express');
const firebase = require('firebase');
const func = require('./databaseFunctions');

const app = express();

var config = {
    apiKey: "AIzaSyD6_v5q5Yuwki5-C9uBie551bEHTBtBNcY",
    databaseURL: "https://mtaa-cc329.firebaseio.com/",
    authDomain: "mtaa-cc329.firebaseapp.com",
    storageBucket: "gs://mtaa-cc329.appspot.com/",

};

var admin = require("firebase-admin");

var serviceAccount = require("C:\\Users\\Ivana\\repos\\Mtaa\\MTAA-BE\\backend\\functions\\mtaa-cc329-firebase-adminsdk-1yl5j-578be1ffdc.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://mtaa-cc329.firebaseio.com"
});
var bucket = admin.storage().bucket();

firebase.initializeApp(config);

app.get('/helloWorld', (request, response) => {
    response.status(200).json({ message : "Hello world"})
    return;
});

app.post('/user/register', (req, res) => {
    const { name, password, email } = req.body
    if( name === null || password === null || email === null)
    {
        res.status(400).json({ message : "One of required parameters is missing : {name, password, email}" });
        return;
    }
    auth.fetchSignInMethodsForEmail(email).then(
        function(value) {        
            if (value.length > 0) 
            {
                res.status(400).json({ message : "Unable to register, email is already in use" })
                return;
            }
            else 
            {
                auth.createUserWithEmailAndPassword(email, password).then(function(value) {

                    func.createNewUser(value.user.uid, email, name, "customer").then(
                        function(newUser) {
                            res.status(201).json({
                                message : "User was succesfully created",
                                user : newUser
                            })
                            return;
                        },
                        function(error) {
                            res.status(400).json({ 
                                message : error.message,
                                errorCode : error.code
                            })
                            return;
                        }
                    ).catch(function (error) {
                        res.status(400).json({ 
                            message : error.message,
                            errorCode : error.code
                        })
                        return;
                    });
                    return;
                }).catch(function (error) {
                    res.status(400).json({ 
                        message : error.message,
                        errorCode : error.code
                    })
                    return;
                });
            }
            return;
    }).catch(function (error) {
        res.status(400).json({ 
            message : error.message,
            errorCode : error.code
        })
        return;
    });
});

app.post('/user/login', (req, res) => {
    const { password, email } = req.body
    if( password === null || email === null)
    {
        res.status(400).json({ message : "One of required parameters is missing : {password, email}" });
        return;
    }
    console.log(password + " " + email)
    auth.signInWithEmailAndPassword(email, password).then(
        function(value) {
            func.getUser(value.user.uid).then(function (value){
                if (value !== null )
                {
                    res.status(200).json({ 
                        message : "User " + email + " succesfully signed in",
                        user : value 
                    });
                    return;
                }
                else
                {
                    res.status(400).json({ message : "Bad user Id, no user with that Id exists" });
                    return;
                }
            }, function(error){
                res.status(500).json({ message : "Couldn't get your request"})
                return;
            }).catch(function (error) {
                res.status(500).json({ message : "Couldn't get your request"})
                return;
            })
            return;
        }, 
        function(error){
            res.status(400).json({
                errorCode : error.code,
                message : error.message
            })
            return;
        }).catch(function (error) {
            res.status(400).json({
                errorCode : error.code,
                message : error.message
            })
            return;
        });
});

app.get('/user', (req, res) => {
    const userId = req.query.userId;
    if( userId === null )
    {
        res.status(400).json({ message : "One of required parameters is missing : {userId}" });
        return;
    }
    func.getUser(userId).then(function (value){
        if (value !== null )
        {
            res.status(200).json({ user : value });
            return;
        }
        else
        {
            res.status(400).json({ message : "Bad user Id, no user with that Id exists" });
            return;
        }
    }, function(error){
        res.status(500).json({ message : "Couldn't get your request"})
        return;
    }).catch(function (error) {
        res.status(500).json({ message : "Couldn't get your request"})
        return;
    })
});

app.post('/order/createNew', (req, res) => {
    const { userId, restaurantId, tableId } = req.body;
    if ( restaurantId === null || tableId === null || userId === null || restaurantId.length <= 1 || tableId.length <= 0){
        res.status(400).json({ message : "One of required parameters is missing : {restaurantId, tableId, userId}" });
        return;
    }
    func.checkTableIfFree(restaurantId, tableId).then(function (value) {
        var isTableEmpty = value
        console.log(isTableEmpty)
        if (isTableEmpty === true)
        {
            var v = func.createNewOrder(restaurantId, tableId, userId).then(function (value){
                console.log(value)
                res.status(201).json({ 
                    message : "New order was created",
                    order : value
                })
                return;
            }, function (error){
                console.log(error)
                res.status(500)
                return;
            }).catch(function (error) {
                res.status(400).json({ 
                    message : error.message,
                    errorCode : error.code
                })
                return;
            });
            return;
        }
        else
        if (isTableEmpty === false)
        {
            res.status(400).json({
                message : "Unexisting table or restaurant."
            })
            return;
        }
        else
        {
            res.status(403).json({
                order : isTableEmpty,
                message : "Table already has opened order."
            })
            return;
        }
    }, function (error){
        console.log(error)
        res.status(500)
        return;
    }).catch(function (error) {
        res.status(400).json({ 
            message : error.message,
            errorCode : error.code
        })
        return;
    });
    return;
 })

app.post('/order/joinRequest', (req, res) => {
    const { userId, restaurantId, tableId, orderId } = req.body;
    if ( userId === null || restaurantId === null || tableId === null || orderId === null )
    {
        res.status(400).json({ message : "One of required parameters is missing : {userId, restaurantId, tableId, orderId}" })
        return;
    }
    func.getOrder(restaurantId, tableId, orderId).then(function (value){
        if (value === null){
            res.status(400).json({ message : "No order with given path found" });
            return;
        }
        func.getActiveStatusOfUser(restaurantId, tableId, orderId, userId).then(function (value){
            if(value !== null)
            {
                res.status(400).json({ message : "User is already in order" });
                return; 
            }
            else
            {
              func.createJoinTableRequest(restaurantId, tableId, userId, orderId).then(
                function(value) {
                    res.status(200).json({
                        message : "New request for join table was created.",
                        request : value
                    })
                    return;
                },
                function(error) {
                    res.status(400).json({
                        errorCode : error.code,
                        message : error.message
                    })
                    return;
                }).catch(function (error) {
                    res.status(400).json({ 
                        message : error.message,
                        errorCode : error.code
                    })
                    return;
                });
                return; 
            }
            
        }, function(error){
            res.status(500).json({ message : "Couldn't get your request"})
            return;
        }).catch(function (error) {
            res.status(400).json({ 
                message : error.message,
                errorCode : error.code
            })
            return;
        });
        return;
    }).catch(function (error) {
        res.status(400).json({ 
            message : error.message,
            errorCode : error.code
        })
        return;
    });
    return;
})

app.post('/order/addNewUser', (req, res) => {
    const { userId, orderId, requestId, restaurantId, tableId, accepted } = req.body;

    if (userId === null || orderId === null || requestId === null || restaurantId === null || tableId === null || accepted === null)
    {
        res.status(400).json({
            message : "One or more of these fields - userId, orderId, requestId, restaurantId, tableId, accepted - are missing."
        })
        return;
    }

    func.getJoinRequest(restaurantId, tableId, requestId).then(
        function(value) {
            if  (value !== null){
                if (value.aprover === userId) {
                    if (accepted === "true") {
                        func.addNewUserToOrder(value.requirer, orderId, requestId, restaurantId, tableId).then(
                            function(value) {
                                res.status(200).json({
                                    message : "New user was added to order.",
                                    order : value
                                })
                                return;
                            },
                            function(error) {
                                res.status(400).json({
                                    errorCode : error.code,
                                    message : error.message
                                })
                                return;
                            }
                        ).catch(function (error) {
                            res.status(400).json({ 
                                message : error.message,
                                errorCode : error.code
                            })
                            return;
                        });
                        return;
                    }
                    else if (accepted === "false") {
                        func.rejectJoinRequest(value.requirer, restaurantId, tableId, requestId, orderId).then(
                            function(value) {
                                res.status(200).json({
                                    message : "Join request was rejected.",
                                    order : value
                                })
                                return;
                            },
                            function(error) {
                                res.status(400).json({
                                    errorCode : error.code,
                                    message : error.message
                                })
                                return;
                            }
                        ).catch(function (error) {
                            res.status(400).json({ 
                                message : error.message,
                                errorCode : error.code
                            })
                            return;
                        });
                        return;
                    }
                    else {
                        console.log("aaa")
                        res.status(400).json({
                            message : "Bad request."
                        })
                        return;
                    }
                }
                else {
                    res.status(400).json({
                        message : "User is not an approver of request."
                    })
                    return;
                }
            }
            else {
                console.log("bbb")

                res.status(400).json({
                    message : "Bad request."
                })
                return;
            }
        },
        function(error) {
            res.status(400).json({
                errorCode : error.code,
                message : "Request does not exist."
            })
            return;
        }
    ) .catch(function (error) {
        res.status(400).json({ 
            message : error.message,
            errorCode : error.code
        })
        return;
    });
    return; 
})

app.get('/restaurant/getMenu', (req, res) => {
  //  const { restaurantId } 
    const restaurantId = req.query.restaurantID;
    if ( restaurantId === null ){
        res.status(400).json({ message : "Missing restaurantId" });
        return;
    }
    func.getMenu(restaurantId).then(function (value){
        if (value !== null )
        {
            res.status(200).json({ menu : value.foods });
            return;
        }
        else
        {
            res.status(400).json({ message : "Bad restaurand Id, no restaurant with that Id exists" });
            return;
        }
    }, function(error){
        res.status(500).json({ message : "Couldn't get your request"})
        return;
    }).catch(function (error) {
        res.status(500).json({ message : "Couldn't get your request"})
        return;
    })
})

app.get('/restaurant/getFood', (req, res) => {
    const restaurantId = req.query.restaurantID;
    const foodId = req.query.foodId;

  //  const { restaurantId, foodId } = req.body;
    if ( restaurantId === null || restaurantId.length <= 0 || foodId === null || foodId.length <= 0 ){
        res.status(400).json({ message : "Missing restaurantId" });
        return;
    }

    console.log(restaurantId + " " + foodId)
    func.getFood(restaurantId, foodId).then(function (value){
        if (value !== null )
        {
            res.status(200).json( value );
            return;
        }
        else
        {
            func.getNumberOfFoodsInRestaurant(restaurantId).then(function (value) {
                if (value === null)
                {
                    res.status(400).json({ message : "Bad restaurand Id, no restaurant with that Id exists" });
                    return;
                }
                else
                {
                    res.status(400).json({ message : "Bad food Id, restaurant has " + value + " items on menu" });
                    return;
                }
            }).catch(function (error) {
                res.status(400).json({ 
                    message : error.message,
                    errorCode : error.code
                })
                return;
            });
            return;
        }
    }, function(error){
        res.status(500).json({ message : "Couldn't get your request"})
        return;
    }).catch(function (error) {
        res.status(500).json({ message : "Couldn't get your request"})
        return;
    })
})

app.post('/order/addNewItem', (req, res) => {
    const { restaurantId, userId, orderId, tableId, foods } = req.body;
    if (userId === null || orderId === null || restaurantId === null || tableId === null || foods === null)
    {
        res.status(400).json({
            message : "One or more of these fields - userId, orderId, restaurantId, tableId, foods - are missing."
        })
        return;
    }
console.log(req.body)
    if(foods.length === 0)
    {
        res.status(400).json({
            message : "Field foods can not be empty."
        })
        return;
    }
    var v = JSON.parse(foods);

    foods1 = v;

    for(var i = 0; i < foods1.length; i++) {
        if( foods1[i].amount === null || foods1[i].id === null) {
            res.status(400).json({
                message : "Bad request."
            })
            return;
        }
    }
    
    func.addNewItemToOrder(restaurantId, userId, orderId, tableId, foods1.foods).then(
        function(value) {
            if (value !== null) {
                if(value === -1){
                    res.status(400).json({ message : "Unexisting item wanted" })
                    return;
                }
                if(value === -2){
                    res.status(400).json({ message : "No order exists for given parameters" })
                    return;
                }
                if(value === -3){
                    res.status(400).json({ message : "User is not amongst active user in order" })
                    return;
                }
                res.status(200).json({
                //    message : "Order was updated.",
                    order : value
                })
                return;
            }
            else {
                res.status(500).json({
                    message : "Can not process your request."
                })
                return;
            }
        },
        function(error) {
            res.status(400).json({
                code : error.code,
                message : error.message
            })
            return;
        }
    ).catch(function (error) {
        res.status(400).json({ 
            message : error.message,
            errorCode : error.code
        })
        return;
    });
})

app.get('/order', (req, res) => {
   // const { restaurantId, tableId, orderId } = req.body;
    const restaurantId = req.query.restaurantId;
    const tableId = req.query.tableId;
    const orderId = req.query.orderId;

    if ( restaurantId === null || tableId === null || orderId === null ){
        res.status(400).json({ message : "One of required parameters is missing : {restaurantId, tableId, orderId}" });
        return;
    }

        func.getOrder(restaurantId, tableId, orderId).then(function (value){
            if (value !== null )
            {
                res.status(200).json( value );
                return;
            }
            else
            {
                res.status(400).json({ message : "Bad request, no order for input parameters" });
                return;
            }
        }, function(error){
            res.status(500).json({ message : "Couldn't get your request"})
            return;
        }).catch(function (error) {
            res.status(500).json({ message : "Couldn't get your request"})
            return;
        })
  

    
})

app.post('/order/transferRequest', (req, res) => {
    const { requirerId, approverId, restaurantId, tableId, orderId, item } = req.body;

    console.log(req.body)
    if (requirerId === null || approverId === null || restaurantId === null || tableId === null || orderId === null || item === null) {
        res.status(400).json({ 
            message : "One of required parameters is missing : {requirerId, approverId, restaurantId, tableId, orderId, item}" 
        })
        return;
    }
    console.log(item.toString())
    console.log(item.toString().replace('\'', ''))
    console.log(item.toString().replace("id", "\"id\"").replace("amount", "\"amount\""))
    var i = JSON.parse(item.toString().replace("id", "\"id\"").replace("amount", "\"amount\""))
    console.log(i)
    if (item.id === null || item.amount === null) {
        res.status(400).json({ 
            message : "One of required parameters in field 'item' is missing : {id, amount}" 
        })
        return;
    }

    if (item.amount <= 0) {
        res.status(400).json({ 
            message : "Amount of item must be more then 0." 
        })
        return;
    }

    func.getActiveStatusOfUser(restaurantId, tableId, orderId, requirerId).then(
        function(requirerStatus) {
            
            if (requirerStatus === "active") {
                func.getActiveStatusOfUser(restaurantId, tableId, orderId, approverId).then(
                    function(approverStatus) {
                        
                        if (approverStatus === "active") {
                            func.createTransferRequest(requirerId, approverId, restaurantId, tableId, orderId, i).then(
                                function (request) {
                                    if(request !== null) {
                                        if (request === false) {
                                            res.status(400).json({
                                                message : "User does not have enough items to transfer."
                                            })
                                            return;
                                        }            
                                        res.status(200).json({
                                            message : "New request for transfer item was created.",
                                            request : request
                                        })
                                        return;
                                    }
                                    else {
                                        res.status(500).json({
                                            message : "Can not process your request.1"
                                        })
                                        return;
                                    }
                                },
                                function(error) {
                                    res.status(500).json({
                                         message : "Can not process your request.2"
                                    })
                                    return;
                                }
                            ).catch(function (error) {
                                res.status(400).json({ 
                                    message : error.message,
                                    errorCode : error.code
                                })
                                return;
                            });
                            return;
                        }
                        else {
                            res.status(400).json({ 
                                message : "Bad request." 
                            })
                            return;
                        }
                    },
                    function(error) {
                        res.status(400).json({ 
                            code: error.code,
                            message : error.message
                        })
                        return;
                    }
                ).catch(function (error) {
                    res.status(400).json({ 
                        message : error.message,
                        errorCode : error.code
                    })
                    return;
                });
                return;
            }
            else {
                res.status(400).json({ 
                    message : "Bad request." 
                })
                return;
            }
        },
        function(error) {
            res.status(400).json({ 
                code: error.code,
                message : error.message
            })
            return;
        }
    ).catch(function (error) {
        res.status(400).json({ 
            message : error.message,
            errorCode : error.code
        })
        return;
    });
})

app.post('/order/acceptTransfer', (req, res) => {
    const { userId, restaurantId, tableId, orderId, requestId, aproved } = req.body;

    if (userId === null || restaurantId === null || tableId === null || orderId === null || requestId === null || aproved === null) {
        res.status(400).json({ 
            message : "One of required parameters is missing : {userId, restaurantId, tableId, orderId, requestId, aproved}" 
        })
        return;
    }
    if (aproved === true)
        console.log("0")
    else
        console.log("1")

        if (aproved === "true")
        console.log("0")
    else
        console.log("1")
        console.log(userId)
        console.log(restaurantId)
        console.log(tableId)
        console.log(orderId)
        console.log(requestId)
    if(aproved === "true"){
        func.acceptTransferItem(userId, restaurantId, tableId, orderId, requestId).then(
            function(value) {
                if (value !== false) {
                    res.status(200).json({
                        message : "Item succefully transfered.",
                        order : value
                    })
                    return;
                }
                else {
                    res.status(400).json({
                        message : "Bad request."
                    }) 
                    return;
                }
            },
            function(error) {
                res.status(400).json({
                    errorCode : error.code,
                    message : error.message
                })
                return;
            }
        ) .catch(function (error) {
            res.status(400).json({ 
                message : error.message,
                errorCode : error.code
            })
            return;
        }); 
    }
    else{
        func.rejectTransferItem(userId, restaurantId, tableId, orderId, requestId).then(
            function(value) {
                if (value !== false) {
                    res.status(200).json({
                        message : "Item transfer succefully rejected.",
                        order : value
                    })
                    return;
                }
                else {
                    res.status(400).json({
                        message : "Bad request."
                    }) 
                    return;
                }
            },
            function(error) {
                res.status(400).json({
                    errorCode : error.code,
                    message : error.message
                })
                return;
            }
        ).catch(function (error) {
            res.status(400).json({ 
                message : error.message,
                errorCode : error.code
            })
            return;
        });  
    }
})

app.get('/joinRequest', (req, res) => {
    const requestId = req.query.requestId;
    const restaurantId = req.query.restaurantId;
    const tableId = req.query.tableId;

    if (requestId === null || restaurantId === null || tableId === null){
        res.status(400).json({ message : "Missing requestId, restaurantId or tableId" });
        return;
    }

    func.getJoinRequest(restaurantId, tableId, requestId).then(function (value){
        if (value !== null)
        {
            res.status(200).json({ request : value });
            return;
        }
        else
        {
            res.status(400).json({ message : "Request does not exist." });
            return;
        }
    }, function(error){
        res.status(500).json({ message : "Couldn't get your request"})
        return;
    }).catch(function (error) {
        res.status(500).json({ message : "Couldn't get your request"})
        return;
    })
})

app.get('/transferRequest', (req, res) => {
    const requestId = req.query.requestId;
    const restaurantId = req.query.restaurantId;
    const tableId = req.query.tableId;

    if (requestId === null || restaurantId === null || tableId === null){
        res.status(400).json({ message : "Missing requestId, restaurantId or tableId" });
        return;
    }

    func.getTransferRequest(restaurantId, tableId, requestId).then(function (value){
        if (value !== null)
        {
            res.status(200).json({ request : value });
            return;
        }
        else
        {
            res.status(400).json({ message : "Request does not exist." });
            return;
        }
    }, function(error){
        res.status(500).json({ message : "Couldn't get your request"})
        return;
    }).catch(function (error) {
        res.status(500).json({ message : "Couldn't get your request"})
        return;
    })
})

app.post('/payment/', (req, res) => {
    const { sum, orderId, userId, tableId, restaurantId, transferRequests } = req.body
    var i = JSON.parse(transferRequests.toString().replace("{\"ids\":", "").replace("}", ""))
console.log(i)
    if (sum === null || orderId === null || userId === null || restaurantId === null || tableId === null) {
        res.status(400).json({ 
            message : "One of required parameters is missing : {sum, orderId, userId, tableId, restaurantId}" 
        });
        return;
    }

    if (sum <= 0) {
        res.status(400).json({ 
            message : "Sum to pay could not be less or equal zero." 
        });
        return;
    }
    console.log(req.body)
    func.getOrder(restaurantId, tableId, orderId).then(function (value){
        if (value === null){
            res.status(400).json({ message : "No order with given path found" });
            return;
        }
        func.getUser(userId).then(function (value){
            if(value !== null)
            {
                func.pay(restaurantId, tableId, userId, orderId, i).then(
                    function(value) {
                        switch (value) {
                            case -1: 
                                res.status(400).json({
                                    message : "User's suborder does not exist."
                                })
                                break;
                            case -2: 
                                res.status(400).json({
                                    message : "User is not an active user of order."
                                })
                                break;
                            case -3: 
                                res.status(400).json({
                                    message : "User has pending item transfers."
                                })
                                break;
                            case -4: 
                                res.status(400).json({
                                    message : "User's suborder does not contain any items to pay."
                                })
                                break;
                            default: 
                                res.status(200).json({
                                    message : "Order has been paid.",
                                    order : value
                                })
                                break;
                        }
                        return;
                    },
                    function(error) {
                        res.status(400).json({
                            message : "Couldn't get your request"
                        })
                        return;
                    }).catch(function (error) {
                        res.status(500).json({ message : "Couldn't get your request"})
                        return;
                    }) 
                    return;
            }
            else
            {
                res.status(400).json({ message : "User does not exist" });
                return; 
            }
            
        }, function(error){
            res.status(500).json({ message : "Couldn't get your request"})
            return;
        }).catch(function (error) {
            res.status(400).json({ 
                message : error.message,
                errorCode : error.code
            })
            return;
        });
        return;
    }).catch(function (error) {
        res.status(400).json({ 
            message : error.message,
            errorCode : error.code
        })
        return;
    });
    
})

var fs = require('fs');

app.put('/upload', (req, res) => {
    var bytes = req.body
    saveImage("image.png", bytes);
    var myFile = req.body;
    bucket.upload("image.png", { public: false, destination: req.query.userId + "/" + req.query.imageId + ".png" }, function(err, file) {
        if (err) {
            console.log(err);
            res.status(400).json({ 
                message : "error" 
            });      
        }
        else {
            res.status(200).json({ 
                message : "Image uploaded" 
            });      
          }
    });
    
})

app.get('/getFile', (req, res) => {
    var storage = firebase.storage;
    var starsRef = storage.storageBucket('logo.png');

    starsRef.getDownloadURL().then(function(url) {
        console.log("success");
        return;
    }).catch(function(error) {

    switch (error.code) {
        case 'storage/object-not-found':
            console.log("object-not-found");
        break;

        case 'storage/unauthorized':
            console.log("unauthorized");
        break;

        case 'storage/canceled':
            console.log("canceled");
        break;
        case 'storage/unknown':
            console.log("unknown");
        break;
    }
    return;
    });
})

function saveImage(filename, data){
    var myBuffer = new Buffer(data.length);
    for (var i = 0; i < data.length; i++) {
        myBuffer[i] = data[i];
    }
    fs.writeFile(filename, myBuffer, function(err) {
        if(err) {
            console.log(err);
        } else {
            console.log("The file was saved!");
        }
    });
  };

exports.app = functions.https.onRequest(app);
