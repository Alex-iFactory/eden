/**
 * Created by Awesome on 1/30/2016.
 */

// use strict
'use strict';

// require dependencies
var mongorito = require('mongorito');

/**
 * build model
 */
class model extends mongorito.Model {
    /**
     * construct model entity
     *
     * @param props
     */
    constructor(attrs, options) {
        // run super
        super(attrs, options);

        // bind set/get methods
        this.getAttributes = this.getAttributes.bind(this);
        this.getAttribute  = this.getAttribute.bind(this);
        this.setAttributes = this.setAttributes.bind(this);

        // bind model methods
        this.load    = this.load.bind(this);
        this.isModel = this.isModel.bind(this);

        // set model location
        this._modelLocation = module.parent.filename.replace(global.appRoot, '');
        this._loads         = {};

        // set attributes before save
        this.before ('save', 'setAttributes');
    }

    /**
     * load id
     *
     * @param id
     * @returns {model}
     */
    * load(id) {
        // load
        let load = yield this.findById(id);

        // construct with load
        this.constructor(load);

        // return this
        return this;
    }

    /**
     * gets models from attributes
     *
     * @param next
     */
    * getAttributes(next) {
        // loop attributes
        for (var key in this.attributes) {
            // set let attribute
            this.getAttribute(key, this.attributes[key]);
        }

        // run next
        if (next) {
            yield next;
        }
    }

    /**
     * gets attribute by key
     *
     * @param key
     * @param attr
     */
    * getAttribute(key, attr) {
        console.log('GETTING ' + key);
        // check if is object
        if (attr === Object(attr) && attr.model) {
            // load model
            if (!this._loads[attr.model]) {
                this._loads[attr.model] = require(global.appRoot + attr.model);
            }

            // yield model
            var load = this._loads[attr.model].load(attr.id);

            // set model
            this.attributes[key] = load;
        } else if (Array.isArray(attr)) {
            // set array variable
            var arr = [];
            // loop object array
            for (var i = 0; i < attr.length; i++) {
                // check if is object
                if (attr[i] === Object(attr[i]) && attr[i].model) {
                    // load model
                    if (!this._loads[attr[i].model]) {
                        this._loads[attr[i].model] = require(global.appRoot + attr[i].model);
                    }

                    // yield model
                    var load = this._loads[attr[i].model].load(attr[i].id);

                    // set model
                    arr.push(load);
                } else {
                    arr.push(attr[i]);
                }
            }

            // set array
            this.attributes[key] = arr;
        }
        console.log(this.attributes[key]);
    }

    /**
     * sets attributes
     *
     * @param next
     */
    * setAttributes(next) {
        // loop attributes
        for (var key in this.attributes) {
            // set let attribute
            let attr = this.attributes[key];

            // check if entity
            if (this.isModel(attr)) {
                // set array for save
                this.set(key, {
                    'id'    : attr.get('_id').toString(),
                    'model' : attr._modelLocation
                });
            } else if (Array.isArray(attr)) {
                // set arr variable
                var arr = [];
                // loop object array
                for (var i = 0; i < attr.length; i++) {
                    // check if is object
                    if (this.isModel(attr[i])) {
                        arr.push({
                            'id'    : attr[i].get('_id').toString(),
                            'model' : attr[i]._modelLocation
                        });
                    } else {
                        arr.push(attr[i]);
                    }
                }

                // set array
                this.set(key, arr);
            }
        }

        // run next
        yield next;
    }

    /**
     * check if model
     *
     * @param obj
     * @returns {boolean}
     * @private
     */
    isModel(obj) {
        // check if model
        if (obj === Object(obj) && obj._modelLocation) {
            return true;
        }
    }
}

/**
 * export default model class
 *
 * @type {model}
 */
module.exports = model;