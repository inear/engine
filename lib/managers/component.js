var ComponentPool = require("./componentpool.js");

function ComponentManager() {
    this.factories = {};
    this.instances = {};
    this.instancesIndexes = {};
    this.pools = {};
    this.instancesDict = {};
}

ComponentManager.prototype.use = function (id, factory) {
    if (typeof factory !== "function") {
        return false;
    }

    if (id === "" || typeof id !== "string") {
        return false;
    }

    if (this.factories.hasOwnProperty(id)) {
        return false;
    }

    this.factories[id] = factory;
    return true;
};

ComponentManager.prototype.create = function (id, options) {
    var instance, index;

    id = id.toString() || "";
    if (!this.factories.hasOwnProperty(id)) {
        return false;
    }

    if (!this.pools.hasOwnProperty(id)) {
        this.pools[id] = new ComponentPool(this.factories[id]);
    }

    instance = this.pools[id].acquire();
    this.factories[id].call(instance, options);

    if (!instance || typeof instance !== "object") {
        console.error("Component factory '" + id + "' did not return an object");
        return false;
    }

    if (!this.instances[id]) {
        this.instances[id] = [];
    }

    if( !this.instancesIndexes[id]) {
        this.instancesIndexes[id] = 1;
    }

    if( !this.instancesDict[id]) {
        this.instancesDict[id] = {};
    }

    this.instancesIndexes[id] = this.instancesIndexes[id]+1;

    index = this.instancesIndexes[id];
    instance._id = index;

    this.instances[id].push(instance);
    this.instancesDict[id][String(index)] = instance;

    return index;
};

ComponentManager.prototype.get = function (type, id) {
    var dict;
    dict = this.instances[type];

    if (dict === undefined) {
        return null;
    }
/*
    if (id === undefined) {
        return list;
    }
*/
    return this.instancesDict[type][String(id)];
    //list[id];
};


ComponentManager.prototype.removeAll = function(type){
  var instance;
  while( this.instances[type].length > 0) {
    instance = this.instances[type].splice(0,1)[0];
    instance._entity = null;
    this.pools[type].release(instance);
  }

  this.instancesDict[type] = undefined;

  return true;
}

ComponentManager.prototype.removeInstance = function(type, id){

    for (var i = this.instances[type].length - 1; i >= 0; i--) {

        if( String(this.instances[type][i]._id) === String(id) ) {
            //remove from list

            var instance = this.instances[type].splice(i,1)[0];
            instance._entity = null;

            this.instancesDict[type][String(id)] = undefined;

            this.pools[type].release(instance);

            return true;
        }
    };

    return false;
}

ComponentManager.prototype.setEntity = function (type, id, entity) {
    var component;

    component = this.get(type, id);
    if (component === null) {
        return false;
    }

    component._entity = entity;
    return true;
};


module.exports = ComponentManager;
