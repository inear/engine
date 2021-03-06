var Loop = require("./loop.js");
var Emitter = require("emitter");
var SystemManager = require("./managers/system.js");
var ComponentManager = require("./managers/component.js");
var EntityManager = require("./managers/entity.js");

function Game() {
    this.systems = new SystemManager();
    this.components = new ComponentManager();
    this.entities = new EntityManager();
    this._config = {};

    this.loop = new Loop();

    this._update = this._update.bind(this);
    this.loop.on("update", this._update);

    this._render = this._render.bind(this);
    this.loop.on("render", this._render);

    this.removeList = [];

    console.log("Engine loaded");
}

Emitter(Game.prototype);


/**
 * Easy function for adding both systems and components
 * One parameter = system
 * Two parameters = component
 */
Game.prototype.use = function () {
    if (arguments.length === 1) {
        var system = this.systems.use(arguments[0]);

        if (system) {

            if (system.init) {
                system.init(this);
            }
            return true;
        }
    } else if (arguments.length === 2) {
        return this.components.use(arguments[0], arguments[1]);
    }

    return false;
};


/**
 * Create an entity with the specified ID
 *
 * If template is supplied, an entity will be created with the requested components
 * Otherwise, an empty entity will be created
 */
Game.prototype.create = function (id, template) {
    var component;

    if (!this.entities.create(id)) {
        return false;
    }

    if (template) {
        for (component in template) {
            if (template.hasOwnProperty(component)) {
                this.add(id, component, template[component]);
            }
        }
    }

    return true;
};

/**
 * Add a new component instance to an entity
 */
Game.prototype.add = function (entityID, componentType, options) {
    var componentID;

    componentID = this.components.create(componentType, options);

    if (componentID === false) {
        //console.error("Component '" + componentType + "' does not exist");
        return false;
    }

    if (!this.entities.add(componentType, componentID, entityID)) {
        //TODO: could not add component to entity, delete the just-created component
        return false;
    }

    this.components.setEntity(componentType, componentID, entityID);

    this.entities.updateIndex(entityID);
    this.emit("componentCreated", componentType, componentID, entityID);

    return true;
};


/**
 * Get an entity by its ID
 * Or get an entity's component
 */
Game.prototype.get = function (id, component) {
    var entity;

    //Get an entity
    if (arguments.length === 1) {
        return this.entities.get(id);
    }

    //Get an entity's component
    if (arguments.length === 2) {
        entity = this.entities.get(id);

        if (!entity || entity[component] === undefined) {
            return;
        }

        return this.components.get(component, entity[component]);
    }

    return undefined;
};

/**
 * Get all entities that have been indexed by components
 */
Game.prototype.getAll = function (components) {
    return this.entities.getAll(components);
};

/**
 * Remove an entity and all its components from the game
 */
Game.prototype.remove = function(entityID, componentType, componentID){

 //Get an entity
  if (arguments.length === 1) {

    if( this.get(entityID) ) {
        this.removeList.push( entityID );
        return true;
    }
    else {
        console.error("Could not find a entity with id: " + entityID);
        return false;
    }
  }

  if (arguments.length === 2) {

    if (this.entities.remove( entityID, componentType)) {
      //remove all instances of a component?

      if( this.components.removeAll(componentType)){
        this.emit("allComponentRemoved", componentType, entityID);
        return true;
      }
    }

  }

  //remove specific component

  if (this.entities.remove( entityID, componentType)) {

    if( this.components.removeInstance(componentType, componentID) ) {
        this.emit("componentRemoved", componentType, componentID, entityID);
        return true;
    }
    else {
        console.error("Could not find a component with id: " + componentID);
        return false;
    }

  }

  return false;

};

Game.prototype.index = function (components) {
    return this.entities.index(components);
};


Game.prototype.config = function (key, val) {
    if (arguments.length === 2) {
        this._config[key] = val;
        this.emit("config", key, val);
        return true;
    }

    if (arguments.length === 1) {
        if (typeof key === "string") {
            return this._config[key];
        } else if (typeof key !== "object") {
            return false;
        } else {
            return this.parseConfig(key);
        }
    }

    return false;
};

Game.prototype.parseConfig = function (obj) {
    var name;

    for (name in obj) {
        if (obj.hasOwnProperty(name)) {
            this._config[name] = obj[name];
            this.emit("config", name, obj[name]);
        }
    }

    return true;
};



Game.prototype.emptyRemoveList = function() {

    for (var i = this.removeList.length - 1; i >= 0; i--) {
        var entityID = this.removeList[i];

        var entity = this.get(entityID);

        if (entity === undefined) {
            console.error("Object '" + entityID + "' does not exist");
            continue;
        }

        var componentType, componentInstance, componentID, componentInstanceID;

        for( componentType in entity ) {

            if (entity.hasOwnProperty(componentType)) {

              componentID =  entity[componentType];

              this.emit("componentRemoved", componentType, componentID, entityID);

                //remove index to current entityID
                if ( this.entities.remove( entityID, componentType) ) {

                    componentInstance = this.components.get(componentType, componentID);

                    if( componentInstance ) {

                        componentInstanceID = componentInstance._id;

                        if( this.components.removeInstance(componentType, componentInstanceID) ) {

                        }
                        else {
                            console.error("Could not find a component with id: " + componentID);

                        }
                    }

                }
                else {
                  console.log('could not remove entity properly ');
                }
            }
        }

        //remove entity itself
        this.entities.remove(entityID);


        this.emit("entityRemoved", entityID);

   }

   this.removeList.length = 0;
};


/**
 * Start the game loop
 * Supply an fps parameter to change the game update rate
 */
Game.prototype.start = function (fps) {
    this.emit("start");
    this.loop.start(fps);
};

Game.prototype._update = function (dt) {
    //this.emit("updateBegin");

    this.systems.update(dt);
    //this.emit("updateEnd");
};

Game.prototype._render = function () {
    //this.emit("renderBegin");
    this.emptyRemoveList();
    this.systems.render();
    this.emit("renderEnd");
};

Game.prototype.destroy = function () {
    this.loop.off("render", this._render);
    this.loop.off("update", this._render);

    this.components.destroy();
    this.entities.destroy();
    this.systems.destroy();
};


Game.prototype.reset = function () {

    for( var key in this.entities.entities ) {
        if( this.entities.entities.hasOwnProperty(key) ) {
            this.removeList.push( key );
        }
    }

    this.emptyRemoveList();

    this.components.reset();
    this.entities.reset();
    this.systems.reset();
};

module.exports = Game;
