var H5PEditor = H5PEditor || {};

/**
 * Interactive Video editor widget module
 *
 * @param {jQuery} $
 */
H5PEditor.widgets.dragQuestion = H5PEditor.DragQuestion = (function ($) {
  /**
   * Initialize interactive video editor.
   *
   * @param {Object} parent
   * @param {Object} field
   * @param {Object} params
   * @param {function} setValue
   * @returns {_L8.C}
   */
  function C(parent, field, params, setValue) {
    var that = this;

    // Set params
    if (params === undefined) {
      this.params = {
        elements: [],
        dropZones: []
      };
      setValue(field, this.params);
    }
    else {
      this.params = params;
    }

    // Get updates for fields
    H5PEditor.followField(parent, 'background', function (params) {
      that.setBackground(params);
    });
    H5PEditor.followField(parent, 'size', function (params) {
      that.setSize(params);
    });

    this.parent = parent;
    this.field = field;
    this.children = [];

    this.passReadies = true;
    parent.ready(function () {
      that.passReadies = false;
    });
  };

  /**
   * Append field to wrapper.
   *
   * @param {type} $wrapper
   * @returns {undefined}
   */
  C.prototype.appendTo = function ($wrapper) {
    this.$item = $(this.createHtml()).appendTo($wrapper);
    this.$editor = this.$item.children('.h5peditor-dragquestion');
    this.$dnbWrapper = this.$item.children('.h5peditor-dragnbar');
    this.$dialog = this.$item.children('.h5peditor-dialog-overlay');
    this.$errors = this.$item.children('.errors');

    this.fontSize = parseInt(this.$editor.css('fontSize'));
  };

  /**
   * Create HTML for the field.
   *
   * @returns {@exp;H5PEditor@call;createItem}
   */
  C.prototype.createHtml = function () {
    return H5PEditor.createItem(this.field.widget, '<span class="h5peditor-label">' + this.field.label + '</span><div class="h5peditor-dragquestion-wrapper"><div class="h5peditor-dragnbar"></div><div class="h5peditor-dragquestion">Please specify task size first.</div><div class="h5peditor-dialog-overlay"><div class="h5peditor-dialog"><div class="h5peditor-dialog-inner"></div><div class="h5peditor-dialog-buttons"><a href="#" class="h5peditor-dialog-button h5peditor-done">' + C.t('done') + '</a><a href="#" class="h5peditor-dialog-button h5peditor-remove">' + C.t('remove') + '</a></div></div></div></div>');
  };

  /**
   * Set current background.
   *
   * @param {Object} params
   * @returns {undefined}
   */
  C.prototype.setBackground = function (params) {
    var path = params === undefined ? '' : params.path;
    if (path !== '') {
      path = H5PEditor.filesPath + (params.tmp !== undefined && params.tmp ? '/h5peditor/' : '/h5p/content/' + H5PEditor.contentId + '/') + path;
    }

    this.$editor.css({
      backgroundImage: 'url(' + path + ')'
    });
  };

  /**
   * Set current dimensions.
   *
   * @param {Object} params
   * @returns {undefined}
   */
  C.prototype.setSize = function (params) {
    if (params === undefined) {
      return;
    }

    var width = this.$editor.width();
    this.$editor.css({
      height: width * (params.height / params.width),
      fontSize: this.fontSize * (width / params.width)
    });

    // TODO: Should we care about resize events? Will only be an issue for responsive designs.

    if (this.dnb === undefined) {
      this.initializeEditor();
    }

    // TODO: Move elements that is outside inside.
  };

  /**
   * Initialize DragNBar and add elements.
   *
   * @returns {undefined}
   */
  C.prototype.initializeEditor = function () {
    var that = this;
    this.$editor.html('').addClass('h5p-ready');

    this.dnb = new H5P.DragNBar(this.getButtons(), this.$editor);

    this.dnb.stopMovingCallback = function (x, y) {
      // Update params when the element is dropped.
      var id = that.dnb.dnd.$element.data('id');
      var params = that.dnb.dnd.$element.hasClass('h5p-dq-dz') ? that.params.dropZones[id] : that.params.elements[id];
      params.x = x;
      params.y = y;
    };

    this.dnb.dnd.releaseCallback = function () {
      // Edit element when it is dropped.
      if (that.dnb.newElement) {
        that.dnb.dnd.$element.dblclick();
      }
    };
    this.dnb.attach(this.$dnbWrapper);

    // Add Elements
    this.elementForms = [];
    for (var i = 0; i < this.params.elements.length; i++) {
      this.generateElementForm(i);
      this.insertElement(i);
    }

    // Add Drop Zones
    for (var i = 0; i < this.params.dropZones.length; i++) {
      this.insertDropZone(i);
    }
  };

  /**
   *
   * @param {type} index
   * @returns {undefined}
   */
  C.prototype.generateElementForm = function (index) {
    if (this.children[index] === undefined) {
      this.children[index] = [];
    }
    var tmpChildren = this.children;

    var $form = H5P.jQuery('<div></div>');
    H5PEditor.processSemanticsChunk(this.field.fields[0].field.fields, this.params.elements[index], $form, this);
    $form.children('.library:first').children('label, select').hide().end().children('.libwrap').css('margin-top', '0');

    tmpChildren[index] = this.children;
    this.children = tmpChildren;

    this.elementForms[index] = $form;
  };

  /**
   * Generate a list of buttons for DnB.
   *
   * @returns {Array} Buttons
   */
  C.prototype.getButtons = function () {
    var that = this;
    var options = this.field.fields[0].field.fields[0].options;

    var buttons = [];
    for (var i = 0; i < options.length; i++) {
      buttons.push(this.getButton(options[i]));
    }

    buttons.push({
      id: 'dropzone',
      title: 'Drop Zone',
      createElement: function () {
        that.params.dropZones.push({
          x: 0,
          y: 0,
          width: 15,
          height: 10,
          correctElements: []
        });

        return that.insertDropZone(that.params.dropZones.length - 1);
      }
    });

    return buttons;
  };

  /**
   *
   * @param {type} library
   * @returns {undefined}
   */
  C.prototype.getButton = function (library) {
    var that = this;
    var id = library.split(' ')[0].split('.')[1].toLowerCase();

    return {
      id: id,
      title: C.t('insertElement', {':type': id}),
      createElement: function () {
        that.params.elements.push({
          type: {
            library: library,
            params: {}
          },
          x: 0,
          y: 0,
          width: 15,
          height: 10,
          dropZones: []
        });

        return that.insertElement(that.params.elements.length - 1);
      }
    };
  };

  /**
   * Insert element at given params index.
   *
   * @param {int} index
   * @returns {undefined}
   */
  C.prototype.insertElement = function (index) {
    var that = this;
    var element = this.params.elements[index];

    var $element = $('<div class="h5p-dq-element" style="width:' + element.width + '%;height:' + element.height + '%;top:' + element.y + '%;left:' + element.x + '%">' + index + '</div>').appendTo(this.$editor).data('id', index).mousedown(function (event) {
      that.dnb.dnd.press($element, event.pageX, event.pageY);
      return false;
    }).dblclick(function () {
      // Edit
      //this.elementForms[index]
      console.log('Editing', index);
    });

    var instance = new (H5P.classFromName(element.type.library.split(' ')[0]))(element.type.params);
    instance.attach($element);

    return $element;
  };

  C.prototype.insertDropZone = function (index) {
    var that = this;
    var dropZone = this.params.dropZones[index];

    var $dropZone = $('<div class="h5p-dq-dz" style="width:' + dropZone.width + '%;height:' + dropZone.height + '%;top:' + dropZone.y + '%;left:' + dropZone.x + '%">' + (dropZone.title !== undefined ? '<div class=="h5p-dq-label">' + dropZone.title + '</div>' : '') + '</div>').appendTo(this.$editor).data('id', index).mousedown(function (event) {
      that.dnb.dnd.press($dropZone, event.pageX, event.pageY);
      return false;
    }).dblclick(function () {
      // Edit
      console.log('Editing', dropZone);
    });

    return $dropZone;
  };

  /**
   * Validate the current field.
   *
   * @returns {Boolean}
   */
  C.prototype.validate = function () {
    return true;
  };

  /**
   * Collect functions to execute once the tree is complete.
   *
   * @param {function} ready
   * @returns {undefined}
   */
  C.prototype.ready = function (ready) {
    if (this.passReadies) {
      this.parent.ready(ready);
    }
    else {
      this.readies.push(ready);
    }
  };

  /**
   * Translate UI texts for this library.
   *
   * @param {String} key
   * @param {Object} vars
   * @returns {@exp;H5PEditor@call;t}
   */
  C.t = function (key, vars) {
    return H5PEditor.t('H5PEditor.DragQuestion', key, vars);
  };

  return C;
})(H5P.jQuery);

// Default english translations
H5PEditor.language['H5PEditor.DragQuestion'] = {
  libraryStrings: {
    insertElement: 'Insert :type',
    done: 'FÆRDI',
    remove: 'FJÆRN'
  }
};