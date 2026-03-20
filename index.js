const {
  option,
  a,
  h5,
  span,
  text_attr,
  script,
  input,
  style,
  domReady,
} = require("@saltcorn/markup/tags");
const tags = require("@saltcorn/markup/tags");
const { select_options } = require("@saltcorn/markup/helpers");
const { features, getState } = require("@saltcorn/data/db/state");
const Table = require("@saltcorn/data/models/table");
const bs5 = features && features.bootstrap5;

const select2 = {
  /** @type {string} */
  type: "Key",
  /** @type {boolean} */
  isEdit: true,
  blockDisplay: true,

  fill_options_restrict(field, v) {
    if (field?.attributes?.ajax) {
      const pk = Table.findOne(field.reftable_name)?.pk_name;
      if (pk) return { [pk]: v || null };
    }
  },

  /**
   * @type {object[]}
   */

  configFields: () => [
    {
      name: "neutral_label",
      label: "Neutral label",
      type: "String",
    },
    {
      name: "ajax",
      label: "Ajax fetch options",
      type: "Bool",
    },
    {
      name: "match_beginning",
      label: "Match beginning only",
      type: "Bool",
    },
    {
      name: "where",
      label: "Where",
      type: "String",
    },
    {
      name: "placeholder",
      label: "Placeholder",
      type: "String",
    },
    {
      name: "maxHeight",
      label: "max-height px",
      type: "Integer",
    },
    {
      name: "force_required",
      label: "Force required",
      sublabel:
        "User must select a value, even if the table field is not required",
      type: "Bool",
    },
    {
      name: "allow_clear",
      label: "Allow clear",
      type: "Bool",
    },
    {
      name: "label_formula",
      label: "Label formula",
      type: "String",
      class: "validate-expression",
      sublabel: "Uses summary field if blank",
    },
  ],

  /**
   * @param {*} nm
   * @param {*} v
   * @param {*} attrs
   * @param {*} cls
   * @param {*} reqd
   * @param {*} field
   * @returns {object}
   */
  run: (nm, v, attrs, cls, reqd, field) => {
    if (attrs.disabled)
      return (
        input({
          class: `${cls} ${field.class || ""}`,
          "data-fieldname": field.form_name,
          name: text_attr(nm),
          id: `input${text_attr(nm)}`,
          readonly: true,
          placeholder: v || field.label,
        }) + span({ class: "ml-m1" }, "v")
      );
    //console.log("select2 attrs", attrs, field);
    const rndSuffix = Math.floor(Math.random() * 16777215).toString(16);

    const table = Table.findOne({ name: field.reftable_name });
    return (
      tags.select(
        {
          class: `form-control ${cls} ${field.class || ""}`,
          "data-fieldname": field.form_name,
          "data-on-cloned": "cloneCb(this)",
          name: text_attr(nm),
          onChange: attrs.onChange,
          id: `input${text_attr(nm)}${rndSuffix}`,
          ...(attrs?.dynamic_where
            ? {
                "data-selected": v,
                "data-fetch-options": encodeURIComponent(
                  JSON.stringify(attrs?.dynamic_where),
                ),
              }
            : {}),
        },
        field.required && attrs.placeholder
          ? tags.option({ value: "" }, "")
          : null,
        attrs.ajax
          ? select_options(
              v,
              { ...field, options: field.options.filter((o) => o.value == v) },
              (attrs || {}).force_required,
              (attrs || {}).neutral_label,
            )
          : select_options(
              v,
              field,
              (attrs || {}).force_required,
              (attrs || {}).neutral_label,
            ),
      ) +
      script(
        domReady(`
    const isWeb = typeof window.parent.saltcorn?.mobileApp === "undefined";
    let url = "/api/${field.reftable_name}";
    if (!isWeb) {
      const { server_path } = parent.saltcorn.data.state.getState().mobileConfig;
      url = server_path + "/api/${field.reftable_name}";
    }

    window.cloneCb = function(select) {
      // remove select2 stuff and reinitialize
      const jSelect = $(select)
      const span = jSelect.next();
      if (span.is("span")) span.remove();
      const script = jSelect.next();
      if (script.is("script")) script.remove();
      jSelect.removeClass("select2-hidden-accessible");
      jSelect.removeAttr("data-select2-id aria-hidden tabindex");
      jSelect.find("option").removeAttr("data-select2-id");
      initSelect2Inp(jSelect.attr("name"));
    }

    window.initSelect2Inp = function(fName) {
      $('#input' + fName + '${rndSuffix}').select2({
        width: '100%',
        ${attrs.placeholder || attrs.allow_clear ? `placeholder: "${attrs.placeholder || ""}",` : ""}
        ${
          attrs.match_beginning
            ? `matcher: function(params, data) {
           params.term = params.term || '';
    if (data.text.toUpperCase().indexOf(params.term.toUpperCase()) == 0) {
        return data;
    }
    return false;
          },`
            : ""
        }
        ${attrs.allow_clear ? `allowClear: true,` : ""}
        ${
          attrs.ajax
            ? ` minimumInputLength: 2,
        minimumResultsForSearch: 10,
        language: "${default_locale}",
        ajax: {
            url: url,
            dataType: "json",
            type: "GET",
            data: function (params) {
    
                var queryParameters = {
                    ${field.attributes.summary_field}: params.term,
                    approximate: true
                }
                if (!isWeb) {
                  const { jwt } = parent.saltcorn.data.state.getState().mobileConfig;
                  queryParameters.jwt = jwt;
                }
                return queryParameters;
            },
            processResults: function (data, q) {
                const term = q.term
                if(!data || !data.success) return [];
                let items = $.map(data.success${attrs.match_beginning ? `.filter(item=>item.${field.attributes.summary_field}.toString().toLowerCase().startsWith(term.toLowerCase()))` : ""}, function (item) {
                    return {
                        text: item.${field.attributes.summary_field},
                        id: item["${table ? table.pk_name : "id"}"],
                    }
                });
                items.sort((a, b) => {
                    if (a.text.length !== b.text.length) 
                        return a.text.length - b.text.length;
                    return a.text.localeCompare(b.text);
                });
                return { results: items };
              }},`
            : ""
        }
        dropdownParent: $('#input' + fName + '${rndSuffix}').parent(),
        dropdownCssClass: "select2-dd-" + fName,
      });
      $('#input' + fName + '${rndSuffix}').on('change', (e) => {
        if (window.handle_identical_fields)
          handle_identical_fields(e);
      });
       $('#input' + fName + '${rndSuffix}').on('set_form_field', (e) => {
        $('#input' + fName + '${rndSuffix}').val(e.target.value)
        $('#input' + fName + '${rndSuffix}').trigger('change')
      });
      $('#input' + fName + '${rndSuffix}').on('select2:open', (e) => {
       const selectId = e.target.id

    $(".select2-search__field[aria-controls='select2-" + selectId + "-results']").each(function (
        key,
        value,
    ){ value.focus();}) });}
    initSelect2Inp("${text_attr(nm)}");`),
      ) +
      (attrs?.maxHeight
        ? style(
            `.select2-container--default .select2-dd-${text_attr(
              nm,
            )} .select2-results>.select2-results__options {max-height: ${
              attrs?.maxHeight
            }px;}`,
          )
        : "")
    );
  },
};
//click to focus above from
//https://stackoverflow.com/a/67691578/19839414

const fieldviews = {
  select2,
  select2_filter: require("./filter"),
  select2_strings: require("./filter_strings"),
  select2_by_code: require("./by_code_strings"),
  //select2_composite_key: require("./select_composite_pk"),
};

const base_headers = `/plugins/public/select2@${
  require("./package.json").version
}`;

const default_locale = getState().getConfig("default_locale", "en");

module.exports = {
  sc_plugin_api_version: 1,
  fieldviews,
  plugin_name: "select2",
  viewtemplates: [require("./edit-nton"), require("./select_and_run_action")],
  headers: [
    {
      script: `${base_headers}/select2.min.js`,
    },
    ...(default_locale && default_locale !== "en"
      ? [
          {
            script: `${base_headers}/i18n/${default_locale}.js`,
          },
        ]
      : []),
    {
      css: `${base_headers}/select2.min.css`,
    },
  ],
  ready_for_mobile: true,
};
