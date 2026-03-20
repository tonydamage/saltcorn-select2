const {
  option,
  a,
  h5,
  span,
  text_attr,
  script,
  input,
  style,
  select,
  domReady,
} = require("@saltcorn/markup/tags");
const { select_options } = require("@saltcorn/markup/helpers");
const { features, getState } = require("@saltcorn/data/db/state");
const default_locale = getState().getConfig("default_locale", "en");
const Table = require("@saltcorn/data/models/table");
const { jsexprToWhere } = require("@saltcorn/data/models/expression");

module.exports = {
  type: "String",
  isFilter: true,
  isEdit: false,
  configFields: [
    {
      name: "ajax",
      label: "Ajax fetch options",
      type: "Bool",
    },
    { name: "multiple", label: "Multiple", type: "Bool" },
    { name: "where", label: "Where", type: "String" },

    /*
    //Doesnt work
    {
      name: "stay_open_on_select",
      label: "Stay open",
      sublabel: "Do not close on select",
      type: "Bool",
    },*/
  ],
  async fill_options(
    field,
    force_allow_none,
    where0,
    extraCtx,
    optionsQuery,
    formFieldNames,
    user,
  ) {
    let wh = {};
    if (field.attributes.where) {
      wh = jsexprToWhere(
        field.attributes.where,
        { ...(extraCtx || {}) },
        Table.findOne({ id: field.table_id }).fields,
      );
    }
    if (field.attributes.ajax) field.options = [];
    else field.options = await field.distinct_values(undefined, wh);
  },
  run: (nm, v, attrs = {}, cls, required, field, state = {}) => {
    const selected = Array.isArray(v)
      ? v
      : typeof v === "undefined" || v === null
        ? []
        : [v];
    let opts = field.options || [];
    if (v && !field.options?.length && field.attributes.ajax)
      opts = [{ value: v, label: v }];
    const options = opts.map((o) =>
      option({ value: o.value, selected: selected.includes(o.value) }, o.label),
    );
    const cleanNm = text_attr(nm)
      .replaceAll(".", "")
      .replaceAll("-", "")
      .replaceAll(">", "");
    const table = Table.findOne({ id: field.table_id });
    return (
      select(
        {
          id: `input${cleanNm}filter`,
          class: `form-control ${cls} ${field.class || ""}`,
          multiple: attrs.multiple ? "multiple" : undefined,
        },
        options,
      ) +
      script(
        domReady(`
      function update() {
       const selected = $('#input${cleanNm}filter').select2('data');
       const sel_ids = selected.map(s=>s.id);
       set_state_field("${nm}", sel_ids, $("#input${cleanNm}filter"))
      }
      let url = "/api/${table.name}";
      const isWeb = typeof window.parent.saltcorn?.mobileApp === "undefined";
      if (!isWeb) {
        const { server_path } = parent.saltcorn.data.state.getState().mobileConfig;
        url = server_path + "/api/${table.name}";
      }
      $('#input${cleanNm}filter').select2({ 
            width: '100%',
            ${attrs.stay_open_on_select ? "closeOnSelect: false," : ""}
            dropdownParent: $('#input${cleanNm}filter').parent(),
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
                    ${field.name}: params.term,
                    approximate: true
                }
                if (!isWeb) {
                  const { jwt } = parent.saltcorn.data.state.getState().mobileConfig;
                  queryParameters.jwt = jwt;
                }
                return queryParameters;
            },
            processResults: function (data) {
                if(!data || !data.success) return [];
                const items = $.map(data.success, function (item) {
                    return {
                        text: item.${field.name},
                        id: item.${field.name},
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
      }).on('select2:select', update).on('select2:unselect', update);
`),
      )
    );
  },
};
