/**
 * Copyright 2018, Warwick Allen.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const base58 = {
  invalidRegExp: /[^1-9A-HJ-NP-Za-km-z]/,
  description: 'the numerals 1\u20139 (not 0), upper-case letters excluding O and I, and lower-case letters excluding l',
};

const Datastore = require('@google-cloud/datastore');
const datastore = Datastore();

function noteKey(addr) {
    return datastore.key(['Note', addr]);
}

function getParam(body, paramName, options) {
  if (options === undefined) {
    options = {};
  }
  const niceName = options.niceName ? options.niceName : paramName;
  if (body[paramName] === undefined) {
    if (options.mandatory) {
      throw new Error(`The ${niceName} is not provided.  Please ensure the "${paramName}" property exists in the request.`);
    }
    return undefined;
  }
  if (options.notNull && body[paramName] === null) {
    throw new Error(`The ${niceName} may not be null.`);
  }
  return body[paramName];
}

function getIntParam(body, paramName, options) {
  const value = getParam(body, paramName, options);
  if (value === undefined) {
    return undefined;
  }
  const strValue = value.toString(10).trim();
  const intValue = parseInt(strValue, 10);
  if (intValue.toString() !== strValue) {
    throw new Error(`${paramName} is not an integer ("${intValue}" != "${strValue}").`);
  }
  return intValue;
}

function getAddr(body) {
  const addr = getParam(body, 'addr', {niceName: 'address', mandatory: true, notNull: true});
  if (addr.length > 35 || addr.length < 26) {
    throw new Error('The address is invalid length.  Please ensure the "addr" property has between 25 and 36 characters (exclusive).');
  }
  if (base58.invalidRegExp.test(addr)) {
    throw new Error(`The address contains invalid characters.  Please ensure the "addr" property contains only ${base58.description}.`);
  }
  return addr;
}

function getCost(body) {
  const cost = getIntParam(body, 'cost', {notNull: true});
  if (cost !== undefined && cost < 0) {
    throw new Error('The cost cannot be negative.');
  }
  return cost;
}

function getValue(body) {
  const value = getIntParam(body, 'value', {notNull: true});
  if (value !== undefined && value < 0) {
    throw new Error('The value cannot be negative.');
  }
  return value;
}

function copyDefinedProperties(src, dst) {
  for (var key in src) {
    if (src[key] !== undefined && src.hasOwnProperty(key)) {
      dst[key] = src[key];
    }
  }
}

exports.setNote = (req, res) => {
  const cost = getCost(req.body);
  const value = getValue(req.body);
  const params = {
    cost: cost,
    costUnit: getParam(req.body, 'costUnit', {mandatory: (cost !== undefined), notNull: true}),
    status: getParam(req.body, 'status'),
    value: value,
    valueUnit: getParam(req.body, 'valueUnit', {mandatory: (value !== undefined), notNull: true}),
  };
  const addr = getAddr(req.body);
  const key = noteKey(addr);
  return datastore.get(key)
    .then(([data]) => {
      var action = 'updated';
      if (!data) {
        data = {};
        action = 'created';
      }
      copyDefinedProperties(params, data);
      const entity = {
        key: key,
        data: data,
      };
      return datastore.save(entity)
        .then(() => {
          res.status(200).send(`{"addr":"${addr}","action":"${action}"}`);
        })
        .catch((err) => {
          console.error(err);
          res.status(500).send(err.message);
          return Promise.reject(err);
        });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send(err.message);
      return Promise.reject(err);
    });
};

exports.getNote = (req, res) => {
  const addr = getAddr(req.body);
  const key = noteKey(addr);
  return datastore.get(key)
    .then(([note]) => {
      if (!note) {
        throw new Error(`There are no notes with the address ${addr}.`);
      }
      note.addr = addr;
      res.status(200).send(note);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send(err.message);
      return Promise.reject(err);
    });
};

exports.deleteNote = (req, res) => {
  const addr = getAddr(req.body);
  const key = noteKey(addr);
  return datastore.delete(key)
    .then(() => {
      res.status(200).send(`{"addr":"${addr}","action":"deleted"}`);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send(err);
      return Promise.reject(err.message);
    });
};

exports.listNotes = (req, res) => {
  const query = datastore
    .createQuery('Note')
    .order('value', {descending: false});
  return datastore.runQuery(query)
    .then((results) => {
      const notes = results[0];
      notes.forEach((note) => {
        note.addr = note[datastore.KEY].name;
      });
      res.status(200).send(notes);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send(err);
      return Promise.reject(err.message);
    });
};
