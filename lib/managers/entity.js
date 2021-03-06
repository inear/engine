var EntityPool = require("./entitypool.js");
var Emitter = require("emitter");

function EntityManager () {
    this.pool = new EntityPool();
    this.entities = {};
    this.indexData = {};
    this.indexMeta = {};
    this.emptyArray = [];
}

Emitter(EntityManager.prototype);

EntityManager.prototype.create = function (id) {
    if (!id) {
        console.error("create call is missing an object ID");
        return false;
    }

    if (this.entities.hasOwnProperty(id)) {
        console.error("An object with this id already exists");
        return false;
    }

    var entity;

    entity = this.pool.acquire();
    entity.id = id;

    this.entities[id] = entity;

    return true;
};

EntityManager.prototype.get = function (id) {
    return this.entities[id];
};

EntityManager.prototype.add = function (componentType, componentID, entityID) {
    var entity;

    entity = this.get(entityID);
    if (entity === undefined) {
        console.error("Object '" + entityID + "' does not exist");
        return false;
    }

    if (entity.hasOwnProperty(componentType)) {
        console.error("Object already has component '" + componentType + "'");
        return false;
    }

    entity[componentType] = componentID;

    return true;
};

EntityManager.prototype.remove = function ( entityID, componentType) {
    var entity;

    entity = this.get(entityID);

    if (entity === undefined) {
        console.error("Object '" + entityID + "' does not exist");
        return false;
    }

    if (arguments.length === 1) {
        //return to pool
        this.pool.release(entity);

        this.updateIndex(entityID);

        //remove entity completely
        delete this.entities[entityID]
    }
    if (arguments.length === 2) {

      if (entity.hasOwnProperty(componentType)) {
          delete entity[componentType];

          //remove index to current entityID
          if( this.indexData[componentType] ) {
            for (var i = this.indexData[componentType].length - 1; i >= 0; i--) {
                if(this.indexData[componentType][i] === entityID) {
                    this.indexData[componentType].splice(i,1);
                }
            }
          }

          return true;

      }
    }


    return false;
};

EntityManager.prototype.index = function () {
    var key,
        entityID,
        components;

    if (arguments.length === 0) {
        return false;
    }

    if (typeof arguments[0] === "string") {
        components = Array.prototype.slice.call(arguments);
    }
    else {
        components = Array.prototype.slice.call(arguments[0]);
    }

    key = components.sort().join(",");

    if (this.indexData.hasOwnProperty(key)) {
        return key;
    }

    this.indexData[key] = [];
    this.indexMeta[key] = components;

    for (entityID in this.entities) {
        if (this.entities.hasOwnProperty(entityID)) {
            this.match(entityID, key);
        }
    }

    return key;
};

EntityManager.prototype.updateIndex = function (entityID) {
    var key;

    if (!this.entities[entityID]) {
        return false;
    }

    //see if entity should be added to any of the existing indexes
    for (key in this.indexMeta) {

        if (this.indexMeta.hasOwnProperty(key)) {
            //entity is already in this index, skip this index
            if (this.indexData[key] && this.indexData[key].indexOf(entityID) !== -1) {
                continue;
            }

            this.match(entityID, key);
        }
    }

    return true;
};

EntityManager.prototype.match = function (entityID, index) {
    var entity, i, match;

    entity = this.entities[entityID];

    //check if entity should be in this index
    for (i = this.indexMeta[index].length - 1; i >= 0; i--) {
        if (!entity.hasOwnProperty(this.indexMeta[index][i])) {
            match = false;
            break;
        }

        match = true;
    }

    if (match === true) {
        this.indexData[index].push(entityID);
    }
};

EntityManager.prototype.getAll = function (key) {

    if (!key) {
        return this.emptyArray;
    }

    if (typeof key !== "string") {
        key = key.join(",");
    }

    return this.indexData[key] || this.emptyArray;
};

EntityManager.prototype.reset = function(){
    this.entities = {};
    //this.indexData = {};
    //this.indexMeta = {};

    for (var key in this.indexMeta) {
        if (this.indexMeta.hasOwnProperty(key)) {
            this.indexData[key].length = 0;
        }
    }
};

EntityManager.prototype.destroy = function(){

  this.pool.destroy();

  for( var key in this.entities ) {
    if( this.entities.hasOwnProperty(key) ) {
      this.entities[key] = undefined;
    }
  }

  this.entities = undefined;
  this.indexData = undefined;
  this.indexMeta = undefined;

};

module.exports = EntityManager;
