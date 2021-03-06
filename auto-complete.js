/*
    JavaScript autoComplete v1.0.4
    Copyright (c) 2014 Simon Steinberger / Pixabay
    GitHub: https://github.com/mauricionobrega/JavaScript-autoComplete.git
    License: http://www.opensource.org/licenses/mit-license.php
*/

var autoComplete = (function (doc) {
    // "use strict";
    function autoComplete(options) {
        if (!doc.querySelector) return;

        // helpers
        function hasClass(el, className) { return el.classList ? el.classList.contains(className) : new RegExp('\\b' + className + '\\b').test(el.className); }

        function addEvent(el, type, handler) {
            if (el.attachEvent) el.attachEvent('on' + type, handler); else el.addEventListener(type, handler);
        }
        function removeEvent(el, type, handler) {
            // if (el.removeEventListener) not working in IE11
            if (el.detachEvent) el.detachEvent('on' + type, handler); else el.removeEventListener(type, handler);
        }
        function live(elClass, event, cb, context) {
            addEvent(context || doc, event, function (e) {
                var found, el = e.target || e.srcElement;
                while (el && !(found = hasClass(el, elClass))) el = el.parentElement;
                if (found) cb.call(el, e);
            });
        }
        function trigger(el, type) {
            var event;
            if ('createEvent' in doc) {
                // modern browsers, IE9+
                event = doc.createEvent('HTMLEvents');
                event.initEvent(type, false, true);
                el.dispatchEvent(event);
            } else {
                // IE 8
                event = doc.createEventObject();
                event.eventType = type;
                el.fireEvent('on' + event.eventType, event);
            }
        }

        var o = {
            selector: 0,
            source: 0,
            minChars: 3,
            delay: 150,
            offsetLeft: 0,
            offsetTop: 1,
            cache: 1,
            menuClass: '',
            wrapper: doc.body,
            renderItem: function (item, search) {
                // escape special characters
                search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                var re = new RegExp("(" + search.split(' ').join('|') + ")", "gi");
                return '<div class="autocomplete-suggestion" data-val="' + item + '">' + item.replace(re, "<b>$1</b>") + '</div>';
            },
            onSelect: function (e, term, item) { },
            onHover: function (e, term, item) { },
            onShow: function () { },
            onHide: function () { },
            blurHandler: undefined
        };
        for (var k in options) { if (options.hasOwnProperty(k)) o[k] = options[k]; }
        // init
        var elems = typeof o.selector == 'object' ? [o.selector] : doc.querySelectorAll(o.selector);
        for (var i = 0; i < elems.length; i++) {
            var that = elems[i];

            // set in instance options
            that.scOptions = o;

            // create suggestions container "sc"
            that.sc = doc.createElement('div');
            that.sc.className = 'autocomplete-suggestions ' + o.menuClass;

            that.autocompleteAttr = that.getAttribute('autocomplete');
            that.setAttribute('autocomplete', 'off');
            that.cache = {};
            that.last_val = '';

            that.updateSC = function (resize, next) {
                var rect = that.getBoundingClientRect();
                if (!options.wrapper) {
                    that.sc.style.left = Math.round(rect.left + (window.pageXOffset || doc.documentElement.scrollLeft) + o.offsetLeft) + 'px';
                    that.sc.style.top = Math.round(rect.bottom + (window.pageYOffset || doc.documentElement.scrollTop) + o.offsetTop) + 'px';
                    that.sc.style.width = Math.round(rect.right - rect.left) + 'px'; // outerWidth
                }
                if (!resize) {
                    that.sc.style.display = 'block';
                    o.onShow(that);
                    if (!that.sc.maxHeight) { that.sc.maxHeight = parseInt((window.getComputedStyle ? getComputedStyle(that.sc, null) : that.sc.currentStyle).maxHeight); }
                    if (!that.sc.suggestionHeight) {
                        var suggestion = that.sc.querySelector('.autocomplete-suggestion');
                        that.sc.suggestionHeight = suggestion ? that.sc.querySelector('.autocomplete-suggestion').offsetHeight : 1;
                    }
                    if (that.sc.suggestionHeight) {
                        if (!next) that.sc.scrollTop = 0;
                        else {
                            var scrTop = that.sc.scrollTop, selTop = next.getBoundingClientRect().top - that.sc.getBoundingClientRect().top;
                            if (selTop + that.sc.suggestionHeight - that.sc.maxHeight > 0)
                                that.sc.scrollTop = selTop + that.sc.suggestionHeight + scrTop - that.sc.maxHeight;
                            else if (selTop < 0)
                                that.sc.scrollTop = selTop + scrTop;
                        }
                    }
                }
            }
            addEvent(window, 'resize', that.updateSC);
            o.wrapper.appendChild(that.sc);

            live('autocomplete-suggestion', 'mouseleave', function (e) {
                var sel = that.sc.querySelector('.autocomplete-suggestion.selected');
                if (sel) setTimeout(function () { sel.className = sel.className.replace('selected', ''); }, 20);
            }, that.sc);

            live('autocomplete-suggestion', 'mouseover', function (e) {
                var sel = that.sc.querySelector('.autocomplete-suggestion.selected');
                if (sel) sel.className = sel.className.replace('selected', '');
                this.className += ' selected';
                o.onHover(e, that.value, this);
            }, that.sc);

            live('autocomplete-suggestion', 'mousedown', function (e) {
                if (hasClass(this, 'autocomplete-suggestion')) { // else outside click
                    var v = this.getAttribute('data-val');
                    that.value = v;
                    o.onSelect(e, v, this);
                    that.sc.style.display = 'none';
                    o.onHide(that);
                }
            }, that.sc);

            that.blurHandler = (o.blurHandler && typeof o.blurHandler === 'function') ? o.blurHandler : function () {
                try { var over_sb = doc.querySelector('.autocomplete-suggestions:hover'); } catch (e) { var over_sb = 0; }
                if (!over_sb) {
                    that.last_val = that.value;
                    that.sc.style.display = 'none';
                    o.onHide(that);
                    setTimeout(function () { that.sc.style.display = 'none'; o.onHide(that); }, 350); // hide suggestions on fast input
                } else if (that !== doc.activeElement) setTimeout(function () { that.focus(); }, 20);
            };
            addEvent(that, 'blur', that.blurHandler);

            var suggest = function (data) {
                var val = that.value;
                that.cache[val] = data;
                if (data.length && val.length >= o.minChars) {
                    var s = '';
                    for (var i = 0; i < data.length; i++) s += o.renderItem(data[i], val);
                    that.sc.innerHTML = s;
                    that.updateSC(0);
                }
                else {
                    that.sc.style.display = 'none';
                    o.onHide(that);
                }
                trigger(doc, 'suggest[end]');
            }

            that.keydownHandler = function (e) {
                var key = window.event ? e.keyCode : e.which;
                // down (40), up (38)
                if ((key == 40 || key == 38) && that.sc.innerHTML) {
                    var next, sel = that.sc.querySelector('.autocomplete-suggestion.selected');
                    if (!sel) {
                        next = (key == 40) ? that.sc.querySelector('.autocomplete-suggestion') : that.sc.childNodes[that.sc.childNodes.length - 1]; // first : last
                        next.className += ' selected';
                        that.value = next.getAttribute('data-val');
                        o.onHover(e, that.value, next);
                    } else {
                        next = (key == 40) ? sel.nextSibling : sel.previousSibling;
                        if (next) {
                            sel.className = sel.className.replace('selected', '');
                            next.className += ' selected';
                            that.value = next.getAttribute('data-val');
                            o.onHover(e, that.value, next);
                        }
                        else { sel.className = sel.className.replace('selected', ''); that.value = that.last_val; next = 0; }
                    }
                    that.updateSC(0, next);
                    return false;
                }
                // esc
                else if (key == 27) { that.value = that.last_val; that.sc.style.display = 'none'; o.onHide(that); }
                // enter
                else if (key == 13 || key == 9) {
                    var sel = that.sc.querySelector('.autocomplete-suggestion.selected');
                    if (sel && that.sc.style.display != 'none') { o.onSelect(e, sel.getAttribute('data-val'), sel); setTimeout(function () { that.sc.style.display = 'none'; o.onHide(that); }, 20); }
                }
            };
            addEvent(that, 'keydown', that.keydownHandler);

            that.keyupHandler = function (e) {
                var key = window.event ? e.keyCode : e.which;
                if (!key || (key < 35 || key > 40) && key != 13 && key != 27) {
                    var val = that.value;
                    if (val.length >= o.minChars) {
                        if (val != that.last_val) {
                            that.last_val = val;
                            clearTimeout(that.timer);
                            if (o.cache) {
                                if (val in that.cache) { suggest(that.cache[val]); return; }
                                // no requests if previous suggestions were empty
                                for (var i = 1; i < val.length - o.minChars; i++) {
                                    var part = val.slice(0, val.length - i);
                                    if (part in that.cache && !that.cache[part].length) { suggest([]); return; }
                                }
                            }
                            that.timer = setTimeout(function () { o.source(val, suggest, that) }, o.delay);
                        }
                    } else {
                        that.last_val = val;
                        that.sc.style.display = 'none';
                        o.onHide(that);
                    }
                }
            };
            addEvent(that, 'keyup', that.keyupHandler);

            that.focusHandler = function (e) {
                that.last_val = '\n';
                that.keyupHandler(e)
            };
            if (!o.minChars) addEvent(that, 'focus', that.focusHandler);
        }

        // public destroy method
        this.destroy = function () {
            for (var i = 0; i < elems.length; i++) {
                var that = elems[i];
                removeEvent(window, 'resize', that.updateSC);
                removeEvent(that, 'blur', that.blurHandler);
                removeEvent(that, 'focus', that.focusHandler);
                removeEvent(that, 'keydown', that.keydownHandler);
                removeEvent(that, 'keyup', that.keyupHandler);
                if (that.autocompleteAttr)
                    that.setAttribute('autocomplete', that.autocompleteAttr);
                else
                    that.removeAttribute('autocomplete');
                doc.body.removeChild(that.sc);
                that = null;
            }
        };

        // public elems
        this.elems = elems;
    }
    return autoComplete;
})(document);

(function () {
    if (typeof define === 'function' && define.amd)
        define('autoComplete', function () { return autoComplete; });
    else if (typeof module !== 'undefined' && module.exports)
        module.exports = autoComplete;
    else
        window.autoComplete = autoComplete;
})();
