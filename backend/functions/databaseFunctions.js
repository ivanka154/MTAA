const firebase = require('firebase');

exports.createNewUser = async function (userId, email, name, role) {
  var newUser = {
    id : userId,
    email : email,
    name : name,
    role : role
  }
  console.log("2")
  var updates = {}
  updates["users/" + userId] = newUser;
  
  var v = await update(updates);
  
  if (v === true) {
    return newUser;
  }
  return v;
}; 

exports.getUser = async function (userId) {
  var user = await read("users/" + userId);
  return user;
}; 

exports.createNewOrder = async function ( restaurantId, tableId, userId ) {
  var path = "orders/" + restaurantId + "/" + tableId + "/orders";
  var orderId = getPushKey(path)
  var order = {
    id : orderId,
    owner : userId,
    restaurant : restaurantId,
    table : tableId,
    activeUsers :  { },
    suborders : { }
  }
  order.activeUsers[userId] = "active"
  order.suborders[userId] = { status : "open" }
  var updates = {}
  updates["orders/" + restaurantId + "/" + tableId + "/activeOrder"] = orderId;
  updates[path + "/" + orderId] = order;
  var v = await update(updates);
  if (v === true )
  {
    return order;
  }
  return v;
}

exports.getMenu = async function(restaurantId) {
  var menu = await read("restaurants/" + restaurantId);
  return menu
}

exports.getFood = async function(restaurantId, foodId) {
  var food = await read("restaurants/" + restaurantId + "/foods/" + foodId);
  return food
}

exports.getNumberOfFoodsInRestaurant = async function (restaurantId) {
  var numberOfFoods = await readNumberOfChildren("restaurants/" + restaurantId + "/foods");
  return numberOfFoods
}

exports.getOrder = async function (restaurantId, tableId, orderId) {
  var order = await read("orders/" + restaurantId + "/" + tableId + "/orders/" + orderId);
  return order
}

exports.getActiveStatusOfUser = async function(restaurantId, tableId, orderId, userId){
  var path = "orders/" + restaurantId + "/" + tableId + "/orders/" + orderId + "/activeUsers/" + userId;
  var isActive = await read(path);
  return isActive
}

exports.createJoinTableRequest = async function (restaurantId, tableId, userId, orderId) {
  var requestId = getPushKey("requests/joinTable/" + restaurantId + "/" + tableId )
  var ownerId = await read ("orders/" + restaurantId + "/" + tableId + "/orders/" + orderId + "/owner");
  var request = {
    id : requestId,
    type : "joinTable",
    requirer : userId,
    aprover : ownerId,
    order : orderId
  }
  var updates = {}
  updates["requests/joinTable/" + restaurantId + "/" + tableId + "/" + requestId] = request;
  updates["orders/" + restaurantId + "/" + tableId + "/orders/" + orderId + "/joinRequests/" + requestId ] = true;
  updates["orders/" + restaurantId + "/" + tableId + "/orders/" + orderId + "/activeUsers/" + userId ] = "requested";

  var v = await update(updates);
  if(v === true) 
  {
    return request;
  }
  return v;
}

exports.addNewUserToOrder = async function (requirerId, orderId, requestId, restaurantId, tableId) {
  var path = "orders/" + restaurantId + "/" + tableId + "/orders/" + orderId
  var updates = {}
  updates[path + "/activeUsers/" + requirerId] = "active"
  updates[path + "/suborders/" + requirerId + "/status"] = "open"
  updates[path + "/joinRequests/" + requestId] = null
  updates["requests/joinTable/" + restaurantId + "/" + tableId + "/" + requestId] = null
  var v = await update(updates);
  if(v === true) 
  {
    var order = await read(path)
    return order;
  }
  return v;
}

exports.rejectJoinRequest = async function (requirerId, restaurantId, tableId, requestId, orderId) {
  var path = "orders/" + restaurantId + "/" + tableId + "/orders/" + orderId
  var updates = {}
  updates[path + "/joinRequests/" + requestId] = null
  updates[path + "/activeUsers/" + requirerId] = null

  updates["requests/joinTable/" + restaurantId + "/" + tableId + "/" + requestId] = null

  var v = await update(updates);
  if(v === true) 
  {
    var order = await read(path)
    return order;
  }
  return v;
}

exports.getJoinRequest =  async function(restaurantId, tableId, requestId) {
  var request = await read("requests/joinTable/" + restaurantId + "/" + tableId + "/" + requestId);
  return request
}

exports.getTransferRequest =  async function(restaurantId, tableId, requestId) {
  var request = await read("requests/transferItem/" + restaurantId + "/" + tableId + "/" + requestId);
  return request
}

exports.checkTableIfFree = async function(restaurantId, tableId) {
  var path = "orders/" + restaurantId + "/" + tableId + "/activeOrder";
  var active = await read(path);
  var exists = await read("restaurants/" + restaurantId + "/tables/" + tableId)
  if (exists === null)
    return false
  if(active === null)
    return true
  else
    return active
}

exports.addNewItemToOrder = async function(restaurantId, userId, orderId, tableId, foods) {
  var pathOrder = "orders/" + restaurantId + "/" + tableId + "/orders/" + orderId
  var updates = {}
  var order = await read(pathOrder)
  var isActive = await read("orders/" + restaurantId + "/" + tableId + "/orders/" + orderId + "/activeUsers/" + userId)

  if(order === null)
    return -2
  
    
  if( isActive !== "active"){
    return -3
  }
  const f = [];

  for(var i = 0; i < foods.length; i++) {
    console.log(foods[i])

    f.push(read("restaurants/" + restaurantId + "/foods/" + foods[i].id).then(func.bind(null,pathOrder, userId, foods[i], updates)))
  //  var food = await read("restaurants/" + restaurantId + "/foods/" + foods[i].id);

  }
  await Promise.all(f);

  var v = await update(updates);
  if(v === true) 
  {
    order = await read(pathOrder)
    return order;
  }
  return v;
}

async function func(pathOrder, userId, foods, updates, food)
{
  if(food === null)
  {
    console.log("restaurants/" + restaurantId + "/foods/" + foods.id)
    return -1
  }
  var pathItem = pathOrder + "/suborders/" + userId + "/items/" + foods.id

  updates[pathItem + "/name"] = food.name;
  updates[pathItem + "/price"] = food.price;
  updates[pathItem + "/id"] = food.id;

  var ordered = await read(pathItem + "/ordered");

  if(ordered === null)
    updates[pathItem + "/ordered"] = foods.amount;
  else
    updates[pathItem + "/ordered"] = foods.amount + ordered;

  return
}

exports.createTransferRequest = async function (requirerId, approverId, restaurantId, tableId, orderId, item) {
  var pathOrder = "orders/" + restaurantId + "/" + tableId + "/orders/" + orderId 
  var pathItem = pathOrder + "/suborders/" + requirerId + "/items/" + item.id

  var countOfDelivered = await read(pathItem + "/delivered")
  var countOfTransfered = await read(pathItem + "/transfered")

  if (countOfDelivered === null || countOfDelivered < item.amount) {
    return false;
  }

  var requestId = getPushKey("requests/transferItem/" + restaurantId + "/" + tableId)
  
  var request = {
    id : requestId,
    type : "transferItem",
    requirer : requirerId,
    aprover : approverId,
    order : orderId,
    item : item
  }

  var updates = {}
  updates["requests/transferItem/" + restaurantId + "/" + tableId + "/" + requestId] = request;
  updates["orders/" + restaurantId + "/" + tableId + "/orders/" + orderId + "/transferRequests/" + requestId ] = true;
  updates[pathItem + "/delivered"] = countOfDelivered - item.amount

  if (countOfTransfered === null) {
    updates[pathItem + "/transfered"] = item.amount
  }
  else {
    updates[pathItem + "/transfered"] = countOfTransfered + item.amount
  }

  var v = await update(updates);
  if(v === true) 
  {
    return request;
  }
  return v;
}

exports.acceptTransferItem = async function(userId, restaurantId, tableId, orderId, requestId) {
  var pathOrder = "orders/" + restaurantId + "/" + tableId + "/orders/" + orderId 
  var pathRequest = "requests/transferItem/" + restaurantId + "/" + tableId + "/" + requestId

  var request = await read(pathRequest);

  if(request === null) {
    return false;
  }
  
  var path1 = pathOrder + "/suborders/" + request.aprover + "/items/" + request.item.id + "/delivered"
  var path2 = pathOrder + "/suborders/" + request.requirer + "/items/" + request.item.id + "/transfered"
  var countOfDelivered = await read(path1);
  var countOfTransfered = await read(path2);

  if(userId !== request.aprover) {
    return false;
  }

  var updates = {}

  if (countOfDelivered === null) {
    updates[path1] = request.item.amount 
  }
  else {
    updates[path1] = countOfDelivered + request.item.amount 
  }

  if (countOfTransfered === null || countOfTransfered === request.item.amount) {
    updates[path2] = null
  }
  else {
    updates[path2] = countOfTransfered - request.item.amount
  }

  updates[pathRequest] = null
  updates[pathOrder + "/transferRequests/" + requestId] = null;

  var v = await update(updates);
  if(v === true) {
    var order = await read(pathOrder);
    return order;
  }
  return v;
}

exports.rejectTransferItem = async function(userId, restaurantId, tableId, orderId, requestId) {
  var pathOrder = "orders/" + restaurantId + "/" + tableId + "/orders/" + orderId 
  var pathRequest = "requests/transferItem/" + restaurantId + "/" + tableId + "/" + requestId

  var request = await read(pathRequest);

  if(request === null) {
    return false;
  }
  
  var path1 = pathOrder + "/suborders/" + request.requirer + "/items/" + request.item.id + "/delivered"
  var path2 = pathOrder + "/suborders/" + request.requirer + "/items/" + request.item.id + "/transfered"
  var countOfDelivered = await read(path1);
  var countOfTransfered = await read(path2);

  if(userId !== request.aprover) {
    return false;
  }

  var updates = {}

  if (countOfDelivered === null) {
    updates[path1] = request.item.amount 
  }
  else {
    updates[path1] = countOfDelivered + request.item.amount 
  }

  if (countOfTransfered === null || countOfTransfered === request.item.amount) {
    updates[path2] = null
  }
  else {
    updates[path2] = countOfTransfered - request.item.amount
  }

  updates[pathRequest] = null
  updates[pathOrder + "/transferRequests/" + requestId] = null;

  var v = await update(updates);
  if(v === true) {
    var order = await read(pathOrder);
    return order;
  }
  return v;
}



exports.suborderHasItemsToPay = async function(restaurantId, tableId, userId, orderId) {
  var pathOrder = "orders/" + restaurantId + "/" + tableId + "/orders/" + orderId
  var updates = {}
  const f = [];

  var suborder = await read(pathOrder + "/suborders/" + userId)
  if(suborder === null)
    return -1;

  var isActive = await read(pathOrder + "/activeUsers/" + userId)
  if(isActive !== "active")
    return -2;

  var transferRequests = await read(pathOrder + "/transferRequests/")
  if (transferRequests !== null) {
    for(var i = 0; i < transferRequests.length; i++) {
      var request = "requests/transferItem/" + restaurantId + "/" + tableId + "/" + transferRequests[i];
      var requirer = await read(request + "/requirer")
      var approver = await read(request + "/aprover")

      if(userId == requirer || userId == approver)
        return -3;
    }
  }

  var items = await read(suborder + "/items/")
  if(items === null)
    return -4; 

  for(var i = 0; i < items.length; i++) {
   // f.push(
   //   read("restaurants/" + restaurantId + "/foods/" + foods[i].id)
   // )
  }
  //await Promise.all(f);

  var v = await update(updates);
  if(v === true) 
  {
    order = await read(pathOrder)
    return order;
  }
  return v;
}

function read (path) {
   return firebase.database().ref(path).once('value').then(function (snapshot) {
    var data = snapshot.val() || null; 
 //   console.log(snapshot.val())
    return data;
  }, function (error){
    console.log("Couldnt read data on path :" + path);
    return null;
  });
}

function readNumberOfChildren (path) {
  return firebase.database().ref(path).once('value').then(function (snapshot) {
   var data = snapshot.numChildren() || null; 
   return data;
 }, function (error){
   console.log("Couldnt read data on path :" + path);
   console.log();
   return null;
 });
}

function update (updates) {
  return firebase.database().ref().update(updates, function(a) {
  }).catch(function(error){
    console.log("error");
    return false;
  }).then(function (value){
    console.log(value)
    return true;
  }, function (error){
    console.log(error);
    return false
  });
}

function getPushKey (path) {
  var newPostKey = firebase.database().ref().child('posts').push().key;
  return newPostKey;
}