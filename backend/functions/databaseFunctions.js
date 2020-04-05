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
  
  if (v == true) {
    return newUser;
  }
  return v;
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
  if (v == true )
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

exports.getActiveUsersOnOrder = async function(restaurantId, tableId, orderId, userId){
  var path = "orders/" + restaurantId + "/" + tableId + "/orders/" + orderId + "/activeUsers/" + userId;
  var isActive = await read(path);
  return isActive
  console.log(isActive)

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
  if(v == true) 
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
  if(v == true) 
  {
    var order = await read(path)
    return order;
  }
  return v;
}

exports.rejectJoinRequest = async function (restaurantId, tableId, requestId, orderId) {
  var path = "orders/" + restaurantId + "/" + tableId + "/orders/" + orderId
  var updates = {}
  updates[path + "/joinRequests/" + requestId] = null
  updates["requests/joinTable/" + restaurantId + "/" + tableId + "/" + requestId] = null
  var v = await update(updates);
  if(v == true) 
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

exports.checkTableIfFree = async function(restaurantId, tableId) {
  var path = "orders/" + restaurantId + "/" + tableId + "/activeOrder";
  var active = await read(path);
  if(active == null)
    return true
  else
    return active
}

exports.addNewItemToOrder = async function(restaurantId, userId, orderId, tableId, foods) {
  var pathOrder = "orders/" + restaurantId + "/" + tableId + "/orders/" + orderId
  var updates = {}

  for(var i = 0; i < foods.length; i++) {
    var pathItem = pathOrder + "/suborders/" + userId + "/items/" + foods[i].id

    updates[pathItem + "/name"] = foods[i].name;

    var ordered = await read(pathItem + "/ordered");

    if(ordered == null)
      updates[pathItem + "/ordered"] = foods[i].amount;
    else
      updates[pathItem + "/ordered"] = foods[i].amount + ordered;
  }

  var v = await update(updates);
  if(v == true) 
  {
    var order = await read(pathOrder)
    return order;
  }
  return v;
}

function read (path) {
   return firebase.database().ref(path).once('value').then(function (snapshot) {
    var data = snapshot.val() || null; 
    console.log(snapshot.val())
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
