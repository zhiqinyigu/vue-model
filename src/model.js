import { PROXY_SET_VALUE } from './constant';
import proxy, { transmit } from './proxy';
import { BaseType } from './type';
import { getTreeNode } from './node/node-utils';
import { calculateMixinsData, isCarryProxyValue } from './type/vue-utils';

export default class Model {
  constructor() {
    const self = this;

    self._dormancy = true;
    self.data = {};
    self._each = self._each.bind(self);

    self._each(function (key, dataTypes, defaultValue, isSchema) {
      // if (isComputed) {
      //   const ref = new StoredReference('', defaultValue);

      //   if (!self.computed) {
      //     self.computed = {};
      //     self.$proxy = new Vue({
      //       data: {
      //         value: {},
      //       },
      //     });
      //   }

      //   self.computed[key] = {
      //     get() {
      //       ref.identifier = self.$proxy.value[key];
      //       ref.updateResolvedReference(getTreeNode(self.$vm));
      //       return ref.resolvedReference.node.value;
      //     },
      //     set(val) {
      //       Vue.set(self.$proxy.value, key, val);
      //       self._createChildNode(defaultValue, key, ref);
      //     },
      //   };
      // } else {
      // }
      proxy(
        self.data,
        dataTypes,
        key,
        isSchema
          ? (val) => {
              if (self._dormancy) return;

              if (isCarryProxyValue(val)) {
                const value = val[PROXY_SET_VALUE];
                delete val[PROXY_SET_VALUE];
                return value;
              }

              return self._createChildNode(defaultValue, key, val).value;
            }
          : transmit
      );

      self.data[key] = undefined;
    });
  }

  _createChildNode(defaultValue, key, val) {
    const node = getTreeNode(this.$vm);
    const childNode = defaultValue.instantiate(node, `${node.subpath}/${key}`, val);
    node.replaceChildNode(key, childNode);
    return childNode;
  }

  _each(fn) {
    const dataTypes = this._dataTypes || calculateMixinsData(this.constructor.prototype);

    for (var key in dataTypes) {
      const result = function (defaultValue) {
        const isSchema = defaultValue instanceof BaseType;
        const isComputed = false; // defaultValue instanceof IdentifierReferenceType;
        return fn(key, dataTypes, defaultValue, isSchema, isComputed);
      }.call(this, dataTypes[key]);

      if (result === false) break;
    }
  }

  _calculateInitializeData(data, syncSet) {
    const self = this;
    const res = {};
    data = data || {};

    // @todo 类型检查
    self._each(function (key, _dataTypes, defaultValue, isSchema, isComputed) {
      res[key] = key in data ? data[key] : isSchema ? defaultValue.getDefaultSnapshot() : defaultValue;

      if (syncSet) {
        const updateAll = syncSet === true;
        if (isComputed) {
          if (updateAll || syncSet === 'computed') {
            self.$vm[key] = res[key];
          }
        } else {
          if (updateAll || syncSet === 'data') {
            self.data[key] = res[key];
          }
        }
      }
    });

    return res;
  }
}
