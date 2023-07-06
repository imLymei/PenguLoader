('hasOwn' in Object) || (Object.hasOwn = Object.call.bind(Object.hasOwnProperty));

var openDevTools = function (remote) {
    native function OpenDevTools();
    OpenDevTools(Boolean(remote));
};

var openAssetsFolder = function () {
    native function OpenAssetsFolder();
    OpenAssetsFolder();
};

var openPluginsFolder = function () {
    native function OpenPluginsFolder();
    OpenPluginsFolder();
};

var reloadClient = function () {
    native function ReloadClient();
    ReloadClient();
};

var restartClient = function () {
    fetch('/riotclient/kill-and-restart-ux', {
        method: 'POST'
    });
};

var getScriptPath = function () {
    var error = new Error();
    var stack = error.stack;
    return stack.match(/(?:http|https):\/\/[^\s]+\.js/g)?.[0];
};

var DataStore = new function () {
    native function LoadData();
    native function SaveData();

    let _data;
    function data() {
        if (!(_data instanceof Map)) {
            try {
                var object = JSON.parse(LoadData());
                _data = new Map(Object.entries(object));
            } catch {
                _data = new Map();
            }
        }
        return _data;
    }

    function commitData() {
        var object = Object.fromEntries(_data);
        SaveData(JSON.stringify(object));
    }

    return {
        [Symbol.toStringTag]: 'DataStore',
        has(key) {
            return data().has(String(key));
        },
        get(key, fallback) {
            key = String(key);
            if (data().has(key)) {
                return data().get(key);
            }
            return fallback;
        },
        set(key, value) {
            if (typeof key === 'function' || typeof key === 'object') {
                return false;
            } else {
                data().set(String(key), value);
                commitData();
                return true;
            }
        },
        remove(key) {
            var result = data().delete(String(key));
            commitData();
            return result;
        }
    };
};

var Effect = new function () {
    native function GetEffect();
    native function ApplyEffect();
    native function ClearEffect();

    let listeners = {
        apply: [],
        clear: [],
    };

    function triggerCallbacks(name, ...args) {
        var callbacks = listeners[name];
        if (Array.isArray(callbacks)) {
            for (var callback of callbacks) {
                callback?.apply(null, args);
            }
        }
    }

    return {
        [Symbol.toStringTag]: 'Effect',
        get current() {
            return GetEffect() || null;
        },
        apply(name, options) {
            var old = GetEffect();
            var success = ApplyEffect(name, options);
            if (success) {
                triggerCallbacks('apply', { old, name, options });
            }
            return success;
        },
        clear() {
            ClearEffect();
            triggerCallbacks('clear');
        },
        on(event, callback) {
            var callbacks = listeners[event];
            if (Array.isArray(callbacks)) {
                var idx = callbacks.indexOf(callback);
                if (idx < 0) {
                    callbacks.push(callback);
                }
            }
        },
        off(event, callback) {
            var callbacks = listeners[event];
            if (Array.isArray(callbacks)) {
                var idx = callbacks.indexOf(callback);
                if (idx >= 0) {
                    callbacks.splice(idx, 1);
                }
            }
        }
    };
};

var requireFile = function (path) {
    native function RequireFile();
    return RequireFile(path);
};

var AuthCallback = new function () {
    native function CreateAuthCallbackURL();
    native function AddAuthCallback();
    native function RemoveAuthCallback();

    return {
        [Symbol.toStringTag]: 'AuthCallback',
        createURL() {
            return CreateAuthCallbackURL();
        },
        readResponse(url, timeout) {
            if (typeof timeout !== 'number' || timeout <= 0) {
                timeout = 180000;
            }
            return new Promise(resolve => {
                let fired = false;
                AddAuthCallback(url, response => {
                    fired = true;
                    resolve(response);
                });
                setTimeout(() => {
                    RemoveAuthCallback(url);
                    if (!fired) {
                        resolve(null);
                    }
                }, timeout);
            });
        }
    };
};

var __hookEvents = function () {
    let windowLoaded = false;

    window.addEventListener('load', function () {
        windowLoaded = true;
    })

    function trigger(self, listener) {
        try {
            if (listener.hasOwnProperty('prototype')) {
                listener.call(self);
            } else {
                listener(self);
            }
        } catch (err) {
            console.error(err);
        }
    }

    const windowAddEventListener = window.addEventListener;
    window.addEventListener = function (type, listener, options) {
        if (windowLoaded && type === 'load') {
            trigger(window, listener);
        } else if (document.readyState === 'complete' && type === 'DOMContentLoaded') {
            trigger(window, listener);
        } else {
            windowAddEventListener.call(window, type, listener, options);
        }
    };

    const documentAddEventListener = document.addEventListener;
    document.addEventListener = function (type, listener, options) {
        if ((document.readyState === 'interactive' || document.readyState === 'complete') && type === 'DOMContentLoaded') {
            trigger(document, listener);
        } else {
            documentAddEventListener.call(document, type, listener, options);
        }
    };
};