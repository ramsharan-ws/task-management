const { GetRows, GetRow, RunQuery, KnexBatchUpdateAll, UpdateRow } = require("../../utils/sql-query");
const { FunctionMTMCalulate } = require("./mtm-calculate");
const { UpdateQuotationLaborStudyCalculations } = require("../../services/quotation-labor-study");
const { UpdateQuotationLaborSummary } = require("../../services/quotation-labor-summary");
const { UpdateQuotationPartSummary } = require("../../services/quotation-part-summary");
const { UpdateQuotationProcurementSummary } = require("../../services/quotation-procurement-summary");
const { UpdateQuotationFinalComputations } = require("../../services/final-computation");
const { parse } = require("json2csv");

const FunctionCalculationReCalulate = async (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const calculation_re_calulate_procurements = await FunctionCalculationReCalulateProcurements(params);
      const calculation_re_calulate_mtm = await FunctionCalculationReCalulateMTM(params);
      const mtm_pattern_query = `SELECT * FROM quotation_mtm WHERE mtm_quotation_id=:quotation_id AND mtm_pattern IS NULL`;
      const mtm_pattern = await RunQuery(mtm_pattern_query, params);
      if (mtm_pattern['rows'].length <= 0) {
        const calculation_re_calulate_labor_study = await FunctionCalculationReCalulateLaborStudy(params);
        const calculation_re_calulate_quotation_summary = await FunctionCalculationReCalulateQuotationSummary(params);
      }
      const summary_data_re_calulate = await SummaryDataReCalulate(params);
      if (mtm_pattern['rows'].length <= 0) {
        const package_summary_data_re_calulate = await PackageSummaryDataReCalulate(params);
      }
      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
};

const FunctionCalculationReCalulateProcurements = async (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const quotation_procurements_with_price_query = `SELECT QP.*,PCM.* FROM quotation_procurement AS QP JOIN price_master as PCM ON PCM.pcm_part_number=QP.p_part_number WHERE QP.p_quotation_id=:quotation_id`;
      const quotation_procurements_with_price = await RunQuery(quotation_procurements_with_price_query, params);
      const quotation_data = await GetOne("quotations", {
        id: params['quotation_id'],
      });
      const quotation_procurements = await Promise.all(quotation_procurements_with_price['rows'].map(async (item) => {
        const old_version = quotation_data.compare_version_code;
        const p_ppap_cost = item["p_ppap_cost"] && parseFloat(item["p_ppap_cost"]) >= 0 ? parseFloat(item["p_ppap_cost"]) : 0;
        const p_new_total_component_cost =
          ((parseFloat(item["p_cost_per_piece"]) *
            parseInt(item["p_piece_per_assembly"])) + parseFloat(p_ppap_cost));
        var old_version_procurement = null;
        var p_old_total_component_cost = 0.0;
        if (old_version) {
          const old_quotation = await GetAll(
            "quotations",
            {
              version_code: old_version,
              q_part_number: quotation_data.q_part_number,
              customer_id: quotation_data.customer_id,
            },
            "*",
            1,
            0,
            [{ column: "created_at", order: "desc" }]
          );
          if (old_quotation.length > 0) {
            old_version_procurement =
              await GetOne("quotation_procurement", {
                p_quotation_id: old_quotation[0].id,
                p_new_version: old_version,
                p_part_number: item["pcm_part_number"],
              });
          }
        }
        if (old_version_procurement) {
          p_old_total_component_cost = parseFloat(
            old_version_procurement.p_new_total_component_cost
          );
        }

        var p_cost_difference = parseFloat(p_new_total_component_cost) - parseFloat(p_old_total_component_cost);
        return {
          p_id: item["p_id"],
          p_uuid: item["p_uuid"],
          p_new_total_component_cost: p_new_total_component_cost,
          p_old_total_component_cost: p_old_total_component_cost,
          p_cost_difference: p_cost_difference
        };
      }));
      const updated_ids = await KnexBatchUpdateAll(
        {
          table: "quotation_procurement",
          column: "p_id",
        },
        quotation_procurements
      );
      resolve(updated_ids);
    } catch (error) {
      reject(error);
    }
  });
}

const FunctionCalculationReCalulateMTM = async (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const rfq_variables = await GetOne("quotation_rfqs", {
        qr_quotation_id: params['quotation_id']
      });

      const quotation_mtm_with_procurements_query = `SELECT QMTM.*, QP.p_cost_per_piece FROM quotation_mtm AS QMTM JOIN quotation_procurement AS QP ON QP.p_bom_uuid=QMTM.mtm_bom_uuid WHERE QMTM.mtm_quotation_id=:quotation_id`;
      const quotation_mtm_with_procurements = await RunQuery(quotation_mtm_with_procurements_query, params);
      const quotation_mtm_list = await Promise.all(quotation_mtm_with_procurements['rows'].map(async (item) => {
        const mtm_update_fields = await FunctionMTMCalulate({
          mtm_id: item["id"],
          mtm_uuid: item["mtm_uuid"],
          mtm_estimated_piece_per_pallet: item["mtm_estimated_piece_per_pallet"],
          mtm_piece_per_assembly: item["mtm_piece_per_assembly"],
          engineering_variable_eau: rfq_variables["engineering_variable_eau"],
          engineering_variable_build_months: rfq_variables["engineering_variable_build_months"],
          engineering_variable_stack_height: rfq_variables["engineering_variable_stack_height"],
          engineering_variable_pallet: rfq_variables["engineering_variable_pallet"],
          engineering_variable_storage_efficiency: rfq_variables["engineering_variable_storage_efficiency"],
          engineering_variable_months_on_hand: rfq_variables["engineering_variable_months_on_hand"],
          p_cost_per_piece: item["p_cost_per_piece"],
          mtm_pallet_per_moq: item["mtm_pallet_per_moq"],
        });
        return mtm_update_fields;
      }));
      const updated_ids = await KnexBatchUpdateAll(
        {
          table: "quotation_mtm",
          column: "id",
        },
        quotation_mtm_list
      );
      resolve(params);
    } catch (error) {
      reject(error);
    }
  });
}

const FunctionCalculationReCalulateLaborStudy = async (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const labor_study = await UpdateQuotationLaborStudyCalculations({ lbs_quotation_id: params["quotation_id"] });
      resolve(params);
    } catch (error) {
      reject(error);
    }
  });
}

const FunctionCalculationReCalulateQuotationSummary = async (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const quotation_summary = await UpdateQuotationSummary(params);
      resolve(params);
    } catch (error) {
      reject(error);
    }
  });
}

const UpdateQuotationSummary = async (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const quotation_labor_summary = await UpdateQuotationLaborSummary({
        qls_quotation_id: params["quotation_id"],
      });

      const quotation_part_summary = await UpdateQuotationPartSummary({
        qps_quotation_id: params["quotation_id"],
      });

      const quotation_procurement_summary =
        await UpdateQuotationProcurementSummary({
          qps_quotation_id: params["quotation_id"],
        });
      const labor_study_calculation =
        await UpdateQuotationLaborStudyCalculations({
          lbs_quotation_id: params["quotation_id"],
        });
      const final_computations = await UpdateQuotationFinalComputations({
        qc_quotation_id: params["quotation_id"],
      });
      resolve(labor_study_calculation);
    } catch (error) {
      reject(String(error));
    }
  });
};

const GetAll = async (table, query, attr = "*", limit = 200, offset = 0, order_by = []) => {
  return new Promise(async (resolve, reject) => {
    const rows = await GetRows(table, query, attr, limit, offset, order_by);
    resolve(rows);
  });
};

const GetOne = async (table, query, attr = "*") => {
  return new Promise(async (resolve, reject) => {
    const row = await GetRow(table, query, attr);
    resolve(row);
  });
};


const SummaryDataReCalulate = async (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const quotation_id = params['quotation_id'];

      const quotation_rfq = await GetOne("quotation_rfqs", {
        qr_quotation_id: quotation_id,
      });

      const quotation_labor_summary = await GetOne("quotation_labor_summary", {
        qls_quotation_id: quotation_id,
      });

      const quotation_part_summary = await GetOne("quotation_part_summary", {
        qps_quotation_id: quotation_id,
      });

      const quotation_procurement_summary = await GetOne("quotation_procurement_summary", {
        qpqs_quotation_id: quotation_id,
      });

      const quotation_procurements = `SELECT SUM(p_piece_per_assembly) FROM quotation_procurement WHERE p_quotation_id=:p_quotation_id AND p_cost_per_piece>0`;
      const sum_of_p_piece_per_assembly = await RunQuery(quotation_procurements, {
        p_quotation_id: quotation_id,
      });

      let sum_peak_sqft = null;
      let sum_long_term_sqft_20 = null;
      let sum_go_second_per_part = null;
      let sum_go_total_headcount = null;
      let sum_go_cost_per_part = null;
      let sum_mh_second_per_part = null;
      let sum_mh_total_headcount = null;
      let sum_mh_cost_per_part = null;
      let sum_overhead = null;
      let sum_total_direct_labor_per_peice_cost = null;
      let sum_total_direct_labor_annual_cost = null;
      let sum_cost_per_peice = null;
      let sum_annual_cost = null;
      let sum_allocation_facility_cost = null;
      let sum_allocation_opex_cost = null;
      let sum_allocation_capital_cost = null;
      let sum_burden_cost_per_part = null;
      let sum_process_cost = null;
      let sum_purchase_component_cost = null;
      let sum_acquisition_cost = null;
      let sum_sgap = null;
      let sum_subtotal = null;
      let sum_transport_cost = null;
      let sum_custom_duty_cost = null;
      let sum_annual_total_cost = null;
      let sum_delta_component_cost = null;
      let sum_delta_transport_cost = null;
      let sum_delta_custom_duty_cost = null;
      let sum_number_of_component = sum_of_p_piece_per_assembly && sum_of_p_piece_per_assembly['rows'] && sum_of_p_piece_per_assembly['rows'][0] ? sum_of_p_piece_per_assembly['rows'][0]['sum'] : null;

      if (quotation_part_summary && quotation_part_summary['qps_part_summary'] && quotation_labor_summary && quotation_labor_summary['qls_labor_summary'] && quotation_procurement_summary && quotation_procurement_summary['qpqs_procurement_summary']) {

        const engineering_variable_eau = FloatToFourDigits(quotation_rfq['engineering_variable_eau']);

        sum_peak_sqft = FloatToFourDigits(quotation_part_summary['qps_part_summary']['on_hand_sf']['on_hand_sf_per_piece']);

        sum_long_term_sqft_20 = FloatToFourDigits(quotation_part_summary['qps_part_summary']['long_term_sf']['long_term_sf_per_piece']);

        sum_go_second_per_part = FloatToFourDigits(quotation_labor_summary['qls_labor_summary']['labor_summary_sec']['general_operator_sec']);

        sum_go_total_headcount = FloatToFourDigits(quotation_labor_summary['qls_labor_summary']['labor_summary_total_hc']['general_operator_total_hc']);

        sum_go_cost_per_part = FloatToFourDigits(quotation_labor_summary['qls_labor_summary']['labor_summary_cost_per_piece']['general_operator_cost_per_piece']);

        sum_mh_second_per_part = FloatToFourDigits(quotation_labor_summary['qls_labor_summary']['labor_summary_sec']['material_handler_sec']);

        sum_mh_total_headcount = FloatToFourDigits(quotation_labor_summary['qls_labor_summary']['labor_summary_total_hc']['material_handler_total_hc']);

        sum_mh_cost_per_part = FloatToFourDigits(quotation_labor_summary['qls_labor_summary']['labor_summary_cost_per_piece']['material_handler_cost_per_piece']);

        const overhead_cost_per_piece = FloatToFourDigits(quotation_labor_summary['qls_labor_summary']['labor_summary_cost_per_piece']['overhead_cost_per_piece']);
        sum_overhead = FloatToFourDigits(parseFloat(overhead_cost_per_piece));
        // sum_overhead = FloatToFourDigits(parseFloat(overhead_cost_per_piece) * parseFloat(engineering_variable_eau));

        const general_operator_cost_per_piece = FloatToFourDigits(quotation_labor_summary['qls_labor_summary']['labor_summary_cost_per_piece']['general_operator_cost_per_piece']);
        const material_handler_cost_per_piece = FloatToFourDigits(quotation_labor_summary['qls_labor_summary']['labor_summary_cost_per_piece']['material_handler_cost_per_piece']);

        sum_total_direct_labor_per_peice_cost = FloatToFourDigits(parseFloat(general_operator_cost_per_piece) + parseFloat(material_handler_cost_per_piece));

        sum_total_direct_labor_annual_cost = FloatToFourDigits(parseFloat(sum_total_direct_labor_per_peice_cost) * parseFloat(engineering_variable_eau));

        sum_cost_per_peice = FloatToFourDigits(quotation_part_summary['qps_part_summary']['purchase_component']['purchase_component_per_piece']);

        const purchase_component_per_piece = FloatToFourDigits(quotation_part_summary['qps_part_summary']['purchase_component']['purchase_component_per_piece']);

        sum_annual_cost = FloatToFourDigits(parseFloat(purchase_component_per_piece) * parseFloat(engineering_variable_eau));


        sum_allocation_facility_cost = FloatToFourDigits(quotation_part_summary['qps_part_summary']['facility_cost']['facility_cost_annually']);
        sum_allocation_opex_cost = FloatToFourDigits(quotation_part_summary['qps_part_summary']['opex']['opex_annually']);
        sum_allocation_capital_cost = FloatToFourDigits(quotation_part_summary['qps_part_summary']['capital']['capital_annually']);
        sum_burden_cost_per_part = FloatToFourDigits(quotation_part_summary['qps_part_summary']['burdned_cost']['burdned_cost_per_piece']);
        sum_process_cost = FloatToFourDigits(quotation_part_summary['qps_part_summary']['process_cost']['process_cost_per_piece']);
        sum_purchase_component_cost = FloatToFourDigits(quotation_part_summary['qps_part_summary']['purchase_component']['purchase_component_per_piece']);
        sum_acquisition_cost = FloatToFourDigits(quotation_part_summary['qps_part_summary']['acquisition_cost']['acquisition_cost_per_piece']);

        const sga_per_piece = FloatToFourDigits(quotation_part_summary['qps_part_summary']['sga']['sga_per_piece']);
        const profit_per_piece = FloatToFourDigits(quotation_part_summary['qps_part_summary']['profit']['profit_per_piece']);
        sum_sgap = FloatToFourDigits(parseFloat(sga_per_piece) + parseFloat(profit_per_piece));
        sum_subtotal = FloatToFourDigits(parseFloat(sum_process_cost) + parseFloat(sum_purchase_component_cost) + parseFloat(sum_acquisition_cost) + parseFloat(sum_sgap));

        sum_transport_cost = FloatToFourDigits(quotation_part_summary['qps_part_summary']['transportation']['transportation_per_piece']);
        sum_custom_duty_cost = FloatToFourDigits(quotation_part_summary['qps_part_summary']['customs_and_duties']['customs_and_duties_per_piece']);
        sum_annual_total_cost = FloatToFourDigits((parseFloat(sum_subtotal) + parseFloat(sum_transport_cost) + parseFloat(sum_custom_duty_cost)) * parseFloat(engineering_variable_eau));

        sum_delta_component_cost = FloatToFourDigits(quotation_procurement_summary['qpqs_procurement_summary']['component_price_delta']);
        sum_delta_transport_cost = FloatToFourDigits(quotation_procurement_summary['qpqs_procurement_summary']['transport_price_delta']);
        sum_delta_custom_duty_cost = FloatToFourDigits(quotation_procurement_summary['qpqs_procurement_summary']['custom_and_duties_price_delta']);
      }

      const summary_object = {
        sum_peak_sqft: sum_peak_sqft,
        sum_long_term_sqft_20: sum_long_term_sqft_20,
        sum_go_second_per_part: sum_go_second_per_part,
        sum_go_total_headcount: sum_go_total_headcount,
        sum_go_cost_per_part: sum_go_cost_per_part,
        sum_mh_second_per_part: sum_mh_second_per_part,
        sum_mh_total_headcount: sum_mh_total_headcount,
        sum_mh_cost_per_part: sum_mh_cost_per_part,
        sum_overhead: sum_overhead,
        sum_total_direct_labor_per_peice_cost: sum_total_direct_labor_per_peice_cost,
        sum_total_direct_labor_annual_cost: sum_total_direct_labor_annual_cost,
        sum_cost_per_peice: sum_cost_per_peice,
        sum_annual_cost: sum_annual_cost,
        sum_allocation_facility_cost: sum_allocation_facility_cost,
        sum_allocation_opex_cost: sum_allocation_opex_cost,
        sum_allocation_capital_cost: sum_allocation_capital_cost,
        sum_burden_cost_per_part: sum_burden_cost_per_part,
        sum_process_cost: sum_process_cost,
        sum_purchase_component_cost: sum_purchase_component_cost,
        sum_acquisition_cost: sum_acquisition_cost,
        sum_sgap: sum_sgap,
        sum_subtotal: sum_subtotal,
        sum_transport_cost: sum_transport_cost,
        sum_custom_duty_cost: sum_custom_duty_cost,
        sum_annual_total_cost: sum_annual_total_cost,
        sum_delta_component_cost: sum_delta_component_cost,
        sum_delta_transport_cost: sum_delta_transport_cost,
        sum_delta_custom_duty_cost: sum_delta_custom_duty_cost,
        sum_number_of_component: sum_number_of_component,
        sum_updated_at: "NOW()",
      };

      const update_result = await UpdateRow("summary", { sum_quotation_id: quotation_id }, summary_object);
      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
};

const PackageSummaryDataReCalulate = async (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      let psum_package_name = "";
      let psum_facility_name = "";
      if (params['psum_package_name']) {
        psum_package_name = params['psum_package_name'];
      } else {
        const quotation_id = params['quotation_id'];

        const quotation_rfq = await GetOne("quotation_rfqs", {
          qr_quotation_id: quotation_id,
        });

        psum_package_name = quotation_rfq['rfq_description'];
        psum_facility_name = quotation_rfq['rfq_units'];
      }

      const package_summary = await GetOne("package_summary", {
        psum_package_name: psum_package_name,
      });

      if (package_summary) {
        const summary_facility_params = {
          sum_package: package_summary['psum_package_name']
        }
        const summary_facility_query = `SELECT sum_facility_name FROM summary WHERE sum_is_active=true AND sum_package=:sum_package AND sum_status IN ('ACTIVE','QUOTED','AWARDED') ORDER BY sum_updated_at DESC LIMIT 1`;
        const summary_facility = await RunQuery(summary_facility_query, summary_facility_params);

        const summaries_query_params = {
          sum_package: package_summary['psum_package_name']
        }
        const summaries_query = `SELECT SUM(sum_eau) AS psum_rfq_eau, AVG(sum_number_of_component) AS psum_avg_component, SUM(sum_eau * sum_purchase_component_cost) AS psum_component_expense,SUM(sum_eau * sum_purchase_component_cost) AS psum_component_revenue, SUM(sum_eau * sum_acquisition_cost) AS psum_acquisition_revenue, SUM(sum_peak_sqft+sum_long_term_sqft_20) AS psum_facility_sqft_revenue, SUM(sum_allocation_facility_cost) AS psum_facility_revenue, SUM(sum_allocation_opex_cost) AS psum_opex_revenue, SUM(sum_allocation_capital_cost) AS psum_capital_revenue, SUM(sum_go_cost_per_part*sum_eau) AS psum_labor_go_revenue, SUM(sum_mh_cost_per_part*sum_eau) AS psum_labor_mh_revenue, SUM(sum_overhead*sum_eau) AS psum_labor_oh_revenue, SUM(sum_transport_cost*sum_eau) AS psum_ff_revenue, SUM(sum_custom_duty_cost*sum_eau) AS psum_custom_and_duties_revenue, SUM(sum_sgap*sum_eau) AS psum_sga_revenue,SUM(sum_sgap*sum_eau) AS psum_profit_revenue, SUM(sum_subtotal*sum_eau) AS psum_total_revenue, SUM(sum_go_total_headcount) AS psum_go_headcount, SUM(sum_mh_total_headcount) AS psum_mh_headcount  FROM summary WHERE sum_package=:sum_package AND sum_status IN ('ACTIVE','QUOTED','AWARDED') AND sum_is_active=true`;
        const summaries = await RunQuery(summaries_query, summaries_query_params);

        const summaries_detail = summaries['rows'][0];

        const psum_uuid = package_summary['psum_uuid'];

        const psum_facility_name = summary_facility && summary_facility['rows'] && summary_facility['rows'].length > 0 && summary_facility['rows'][0]['sum_facility_name'] ? summary_facility['rows'][0]['sum_facility_name'] : "Waterloo";
        const psum_rfq_eau = summaries_detail['psum_rfq_eau'];
        const psum_avg_component = summaries_detail['psum_avg_component'];
        const psum_component_expense = summaries_detail['psum_component_expense'];
        const psum_component_revenue = summaries_detail['psum_component_revenue'];
        const psum_acquisition_revenue = summaries_detail['psum_acquisition_revenue'];
        const psum_facility_sqft_revenue = summaries_detail['psum_facility_sqft_revenue'];
        const psum_facility_revenue = summaries_detail['psum_facility_revenue'];
        const psum_opex_revenue = summaries_detail['psum_opex_revenue'];
        const psum_capital_revenue = summaries_detail['psum_capital_revenue'];
        const psum_labor_go_revenue = summaries_detail['psum_labor_go_revenue'];
        const psum_labor_mh_revenue = summaries_detail['psum_labor_mh_revenue'];
        const psum_labor_oh_revenue = summaries_detail['psum_labor_oh_revenue'];
        const psum_ff_revenue = summaries_detail['psum_ff_revenue'];
        const psum_custom_duties_revenue = summaries_detail['psum_custom_and_duties_revenue'];
        const psum_sga_revenue = summaries_detail['psum_sga_revenue'];
        const psum_profit_revenue = summaries_detail['psum_profit_revenue'];
        const psum_total_revenue = summaries_detail['psum_total_revenue'];
        const psum_go_headcount = summaries_detail['psum_go_headcount'];
        const psum_mh_headcount = summaries_detail['psum_mh_headcount'];

        const psum_acquisition_outlay_expense = parseFloat(package_summary['psum_acquisition_outlay_expense']);
        const psum_acquisition_outlay_revenue = parseFloat(package_summary['psum_acquisition_outlay_revenue']);
        const psum_acquisition_overhead_percentage = parseFloat(package_summary['psum_acquisition_overhead_percentage']);
        const psum_acquisition_warranty_percentage = parseFloat(package_summary['psum_acquisition_warranty_percentage']);
        const psum_facility_sqft_expense = parseFloat(package_summary['psum_facility_sqft_expense']);
        const psum_facility_sf_expense = parseFloat(package_summary['psum_facility_sf_expense']);
        const psum_opex_percentage = parseFloat(package_summary['psum_opex_percentage']);
        const psum_capital_percentage = parseFloat(package_summary['psum_capital_percentage']);
        const psum_labor_go_percentage = parseFloat(package_summary['psum_labor_go_percentage']);
        const psum_labor_mh_percentage = parseFloat(package_summary['psum_labor_mh_percentage']);
        const psum_labor_oh_percentage = parseFloat(package_summary['psum_labor_oh_percentage']);
        const psum_ff_percentage = parseFloat(package_summary['psum_ff_percentage']);
        const psum_custom_duties_percentage = parseFloat(package_summary['psum_custom_duties_percentage']);
        const psum_sga_percentage = parseFloat(package_summary['psum_sga_percentage']);
        const psum_profit_percentage = parseFloat(package_summary['psum_profit_percentage']);
        const psum_adjustment_percentage = parseFloat(package_summary['psum_adjustment_percentage']);

        const psum_acquisition_actual_outlay = FloatToFourDigits((parseFloat(psum_component_expense) / 52) * parseFloat(psum_acquisition_outlay_expense));
        const psum_acquisition_interest_percentage = FloatToFourDigits((0.06 / 52) * (parseFloat(psum_acquisition_outlay_expense) / 0.035));
        const psum_acquisition_interest_expense = FloatToFourDigits((0.06 * parseFloat(psum_acquisition_actual_outlay)));
        const psum_acquisition_overhead_expense = FloatToFourDigits(parseFloat(psum_acquisition_revenue) * (parseFloat(psum_acquisition_overhead_percentage) / 100));
        const psum_acquisition_warranty_expense = FloatToFourDigits(parseFloat(psum_facility_sqft_expense) * (parseFloat(psum_acquisition_warranty_percentage) / 100));
        const psum_acquisition_profit = FloatToFourDigits(parseFloat(psum_acquisition_revenue) - parseFloat(psum_acquisition_overhead_expense) - parseFloat(psum_acquisition_interest_expense));
        const psum_facility_sf_revenue = FloatToFourDigits(parseFloat(psum_facility_revenue) / parseFloat(psum_facility_sqft_revenue));
        const psum_facility_percentage = FloatToFourDigits(parseFloat(psum_facility_sqft_expense) / parseFloat(psum_facility_sqft_revenue));
        const psum_facility_expense = FloatToFourDigits(parseFloat(psum_facility_sf_expense) * parseFloat(psum_facility_sqft_expense));
        const psum_facility_profit = FloatToFourDigits(parseFloat(psum_facility_revenue) - parseFloat(psum_facility_expense));
        const psum_opex_expense = FloatToFourDigits(parseFloat(psum_opex_revenue) * (parseFloat(psum_opex_percentage) / 100));
        const psum_opex_profit = FloatToFourDigits(parseFloat(psum_opex_revenue) - parseFloat(psum_opex_expense));
        const psum_capital_expense = FloatToFourDigits(parseFloat(psum_capital_revenue) * (parseFloat(psum_capital_percentage) / 100));
        const psum_capital_profit = FloatToFourDigits(parseFloat(psum_capital_revenue) - parseFloat(psum_capital_expense));
        const psum_labor_go_expense = FloatToFourDigits(parseFloat(psum_labor_go_revenue) * (parseFloat(psum_labor_go_percentage) / 100));
        const psum_labor_go_profit = FloatToFourDigits(parseFloat(psum_labor_go_revenue) - parseFloat(psum_labor_go_expense));
        const psum_labor_mh_expense = FloatToFourDigits(parseFloat(psum_labor_mh_revenue) * (parseFloat(psum_labor_mh_percentage) / 100));
        const psum_labor_mh_profit = FloatToFourDigits(parseFloat(psum_labor_mh_revenue) - parseFloat(psum_labor_mh_expense));
        const psum_labor_oh_expense = FloatToFourDigits(parseFloat(psum_labor_oh_revenue) * (parseFloat(psum_labor_oh_percentage) / 100));
        const psum_labor_oh_profit = FloatToFourDigits(parseFloat(psum_labor_oh_revenue) - parseFloat(psum_labor_oh_expense));
        const psum_ff_expense = FloatToFourDigits(parseFloat(psum_ff_revenue) / (1 + (parseFloat(psum_ff_percentage) / 100)));
        const psum_ff_profit = FloatToFourDigits(parseFloat(psum_ff_revenue) - parseFloat(psum_ff_expense));
        const psum_custom_duties_expense = FloatToFourDigits(parseFloat(psum_custom_duties_revenue) / (1 + (parseFloat(psum_custom_duties_percentage) / 100)));
        const psum_custom_duties_profit = FloatToFourDigits(parseFloat(psum_custom_duties_revenue) - parseFloat(psum_custom_duties_expense));

        const psum_sga_revenue_detail = FloatToFourDigits((parseFloat(psum_sga_revenue) * ((parseFloat(psum_sga_percentage) / 100) / ((parseFloat(psum_sga_percentage) / 100) + (parseFloat(psum_profit_percentage) / 100)))));
        const psum_sga_profit = FloatToFourDigits(psum_sga_revenue_detail);
        const psum_profit_revenue_detail = FloatToFourDigits((parseFloat(psum_profit_revenue) * ((parseFloat(psum_profit_percentage) / 100) / ((parseFloat(psum_sga_percentage) / 100) + (parseFloat(psum_profit_percentage) / 100)))));
        const psum_profit_profit = FloatToFourDigits(psum_profit_revenue_detail);
        const psum_total_expense = FloatToFourDigits(parseFloat(psum_component_expense) + parseFloat(psum_acquisition_interest_expense) + parseFloat(psum_acquisition_overhead_expense) + parseFloat(psum_facility_expense) + parseFloat(psum_opex_expense) + parseFloat(psum_capital_expense) + parseFloat(psum_labor_go_expense) + parseFloat(psum_labor_mh_expense) + parseFloat(psum_labor_oh_expense) + parseFloat(psum_ff_expense) + parseFloat(psum_custom_duties_expense));
        const psum_total_profit = FloatToFourDigits(parseFloat(psum_total_revenue) - parseFloat(psum_total_expense));
        const psum_ebitda = FloatToFourDigits(parseFloat(psum_total_profit) + parseFloat(psum_capital_expense) + parseFloat(psum_facility_expense));

        const package_summary_object = {
          psum_facility_name: psum_facility_name,
          psum_rfq_eau: psum_rfq_eau,
          psum_avg_component: psum_avg_component,
          psum_go_headcount: psum_go_headcount,
          psum_mh_headcount: psum_mh_headcount,
          psum_ebitda: psum_ebitda,
          psum_total_profit: psum_total_profit,
          psum_component_expense: psum_component_expense,
          psum_component_revenue: psum_component_revenue,
          psum_acquisition_outlay_expense: psum_acquisition_outlay_expense,
          psum_acquisition_outlay_revenue: psum_acquisition_outlay_revenue,
          psum_acquisition_actual_outlay: psum_acquisition_actual_outlay,
          psum_acquisition_interest_expense: psum_acquisition_interest_expense,
          psum_acquisition_overhead_percentage: psum_acquisition_overhead_percentage,
          psum_acquisition_overhead_expense: psum_acquisition_overhead_expense,
          psum_acquisition_warranty_percentage: psum_acquisition_warranty_percentage,
          psum_acquisition_warranty_expense: psum_acquisition_warranty_expense,
          psum_acquisition_profit: psum_acquisition_profit,
          psum_facility_sqft_expense: psum_facility_sqft_expense,
          psum_facility_sqft_revenue: psum_facility_sqft_revenue,
          psum_facility_sf_expense: psum_facility_sf_expense,
          psum_facility_sf_revenue: psum_facility_sf_revenue,
          psum_facility_percentage: psum_facility_percentage,
          psum_facility_expense: psum_facility_expense,
          psum_facility_revenue: psum_facility_revenue,
          psum_facility_profit: psum_facility_profit,
          psum_opex_percentage: psum_opex_percentage,
          psum_opex_expense: psum_opex_expense,
          psum_opex_revenue: psum_opex_revenue,
          psum_opex_profit: psum_opex_profit,
          psum_capital_percentage: psum_capital_percentage,
          psum_capital_expense: psum_capital_expense,
          psum_capital_revenue: psum_capital_revenue,
          psum_capital_profit: psum_capital_profit,
          psum_labor_go_percentage: psum_labor_go_percentage,
          psum_labor_go_expense: psum_labor_go_expense,
          psum_labor_go_revenue: psum_labor_go_revenue,
          psum_labor_go_profit: psum_labor_go_profit,
          psum_labor_mh_percentage: psum_labor_mh_percentage,
          psum_labor_mh_expense: psum_labor_mh_expense,
          psum_labor_mh_revenue: psum_labor_mh_revenue,
          psum_labor_mh_profit: psum_labor_mh_profit,
          psum_labor_oh_percentage: psum_labor_oh_percentage,
          psum_labor_oh_expense: psum_labor_oh_expense,
          psum_labor_oh_revenue: psum_labor_oh_revenue,
          psum_labor_oh_profit: psum_labor_oh_profit,
          psum_ff_percentage: psum_ff_percentage,
          psum_ff_expense: psum_ff_expense,
          psum_ff_revenue: psum_ff_revenue,
          psum_ff_profit: psum_ff_profit,
          psum_custom_duties_percentage: psum_custom_duties_percentage,
          psum_custom_duties_expense: psum_custom_duties_expense,
          psum_custom_duties_revenue: psum_custom_duties_revenue,
          psum_custom_duties_profit: psum_custom_duties_profit,
          psum_sga_percentage: psum_sga_percentage,
          psum_sga_revenue: psum_sga_revenue_detail,
          psum_sga_profit: psum_sga_profit,
          psum_profit_percentage: psum_profit_percentage,
          psum_profit_revenue: psum_profit_revenue_detail,
          psum_profit_profit: psum_profit_profit,
          psum_total_expense: psum_total_expense,
          psum_total_revenue: psum_total_revenue,
          psum_adjustment_percentage: psum_adjustment_percentage,
          psum_acquisition_interest_percentage: psum_acquisition_interest_percentage,
          psum_acquisition_revenue: psum_acquisition_revenue,
          psum_updated_at: "NOW()"
        };

        if (psum_facility_name && psum_facility_name != "") {
          package_summary_object['psum_facility_name'] = psum_facility_name;
        }
        const update_result = await UpdateRow("package_summary", { psum_uuid: psum_uuid }, package_summary_object);
        const executive_summary_update = await ExecutiveSummaryDataReCalulate({ package_name: psum_package_name });
        const presentation_summary_update = await PresentationSummaryDataReCalulate({ package_name: psum_package_name });
      }
      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
};

const PackageSummaryDataReCalulateOnSummaryStatusChange = async (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const package_summary_data_re_calulate = await PackageSummaryDataReCalulate(params);
      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
};

const PackageSummaryDataReCalulateOnUpdate = async (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const package_summary_data_re_calulate = await PackageSummaryDataReCalulate(params);
      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
};

const ExecutiveSummaryDataReCalulate = async (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const package_summary = await GetOne("package_summary", { psum_package_name: params['package_name'] });

      const executive_summary = await GetOne("executive_summary", {
        esum_package_name: params['package_name'],
      });

      if (executive_summary) {
        const esum_uuid = executive_summary['esum_uuid'];

        const esum_facility_name = package_summary['psum_facility_name'];
        const adjustment_percentage = FloatToFourDigits(parseFloat(package_summary['psum_adjustment_percentage']) / 100);
        const esum_revenue = FloatToFourDigits(parseFloat(package_summary['psum_total_revenue']) / parseFloat(adjustment_percentage));
        const esum_cogs = FloatToFourDigits(parseFloat(package_summary['psum_component_expense']) / parseFloat(adjustment_percentage));
        const esum_net_work_capital = FloatToFourDigits(parseFloat(package_summary['psum_acquisition_actual_outlay']) / parseFloat(adjustment_percentage));
        const esum_actual_sqft = FloatToFourDigits(parseFloat(package_summary['psum_facility_sf_expense']) / parseFloat(adjustment_percentage));
        const esum_actual_facility_expense = FloatToFourDigits(parseFloat(package_summary['psum_facility_expense']) / parseFloat(adjustment_percentage));
        const esum_general_operator = FloatToFourDigits(parseFloat(package_summary['psum_labor_go_expense']) / parseFloat(adjustment_percentage));
        const esum_material_handler = FloatToFourDigits(parseFloat(package_summary['psum_labor_mh_expense']) / parseFloat(adjustment_percentage));
        const esum_dir_overhead = FloatToFourDigits(parseFloat(package_summary['psum_labor_oh_expense']) / parseFloat(adjustment_percentage));
        const esum_opex = FloatToFourDigits(parseFloat(package_summary['psum_opex_expense']) / parseFloat(adjustment_percentage));
        const esum_annual_capital = FloatToFourDigits(parseFloat(package_summary['psum_capital_expense']) / parseFloat(adjustment_percentage));
        const esum_ff_custom_duties = FloatToFourDigits((parseFloat(package_summary['psum_custom_duties_expense']) + parseFloat(package_summary['psum_ff_expense'])) / parseFloat(adjustment_percentage));
        const esum_direct_cost = FloatToFourDigits(parseFloat(esum_cogs) + parseFloat(esum_general_operator) + parseFloat(esum_material_handler) + parseFloat(esum_opex) + parseFloat(esum_ff_custom_duties));
        const esum_indirect_cost = FloatToFourDigits(parseFloat(esum_actual_facility_expense) + parseFloat(esum_dir_overhead));
        const esum_total_cost = FloatToFourDigits(parseFloat(esum_direct_cost) + parseFloat(esum_indirect_cost));
        const esum_gross_margin = FloatToFourDigits(parseFloat(esum_revenue) - parseFloat(esum_total_cost));
        const esum_sga = FloatToFourDigits(parseFloat(package_summary['psum_sga_revenue']));
        const esum_ebitda = FloatToFourDigits(parseFloat(package_summary['psum_ebitda']) / parseFloat(adjustment_percentage));
        const esum_cash_ebitda = FloatToFourDigits(parseFloat(esum_ebitda) - parseFloat(esum_actual_facility_expense));
        const esum_pbt = FloatToFourDigits(parseFloat(package_summary['psum_total_profit']) / parseFloat(adjustment_percentage));
        const esum_updated_at = "NOW()";


        const executive_summary_update = {
          esum_facility_name: esum_facility_name,
          esum_revenue: esum_revenue,
          esum_cogs: esum_cogs,
          esum_net_work_capital: esum_net_work_capital,
          esum_actual_sqft: esum_actual_sqft,
          esum_actual_facility_expense: esum_actual_facility_expense,
          esum_general_operator: esum_general_operator,
          esum_material_handler: esum_material_handler,
          esum_dir_overhead: esum_dir_overhead,
          esum_opex: esum_opex,
          esum_annual_capital: esum_annual_capital,
          esum_ff_custom_duties: esum_ff_custom_duties,
          esum_direct_cost: esum_direct_cost,
          esum_indirect_cost: esum_indirect_cost,
          esum_total_cost: esum_total_cost,
          esum_gross_margin: esum_gross_margin,
          esum_sga: esum_sga,
          esum_ebitda: esum_ebitda,
          esum_cash_ebitda: esum_cash_ebitda,
          esum_pbt: esum_pbt,
          esum_updated_at: esum_updated_at,
        }

        const update_result = await UpdateRow("executive_summary", { esum_uuid: esum_uuid }, executive_summary_update);
      }
      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
};

const PresentationSummaryDataReCalulate = async (params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const package_summary = await GetOne("package_summary", { psum_package_name: params['package_name'] });

      const presentation_summary = await GetOne("presentation_summary", {
        pres_package_name: params['package_name'],
      });

      if (presentation_summary) {
        const pres_uuid = presentation_summary['pres_uuid'];
        const adjustment_percentage = FloatToFourDigits(parseFloat(package_summary['psum_adjustment_percentage']) / 100);

        const pres_component_variable	= null;
        const pres_acquisition_outlay_variable	= null;
        const pres_acquisition_outlay_profit	= null;
        const pres_acquisition_net_work_variable	= null;
        const pres_acquisition_net_work_revenue	= null;
        const pres_acquisition_net_work_profit	= null;
        const pres_facility_sqft_variable	= null;
        const pres_facility_sqft_profit	= null;
        const pres_facility_sf_variable	= null;
        const pres_facility_sf_profit	= null;
        const pres_sga_expense	= null;
        const pres_profit_expense	= null;
        const pres_gross_total_expense	= null;
        const pres_gross_total_revenue	= null;
        const pres_ebitda_expense	= null;
        const pres_ebitda_revenue	= null;
        const pres_ebitda_profit	= null;

        const pres_component_expense	= FloatToFourDigits(parseFloat(package_summary['psum_component_expense'])/parseFloat(adjustment_percentage));
        const pres_component_revenue	= FloatToFourDigits(parseFloat(package_summary['psum_component_revenue'])/parseFloat(adjustment_percentage));
        const pres_component_profit	= FloatToFourDigits(parseFloat(pres_component_revenue)-parseFloat(pres_component_expense));
        const pres_acquisition_outlay_expense	= FloatToFourDigits(parseFloat(package_summary['psum_acquisition_outlay_expense']));
        const pres_acquisition_outlay_revenue	= FloatToFourDigits(parseFloat(package_summary['psum_acquisition_outlay_revenue']));
        const pres_acquisition_net_work_expense	= FloatToFourDigits(parseFloat(package_summary['psum_acquisition_actual_outlay'])/parseFloat(adjustment_percentage));
        const pres_acquisition_interest_variable	= FloatToFourDigits(parseFloat(package_summary['psum_acquisition_interest_percentage']));
        const pres_acquisition_interest_expense	= FloatToFourDigits(parseFloat(package_summary['psum_acquisition_interest_expense'])/parseFloat(adjustment_percentage));
        const pres_acquisition_interest_revenue	= FloatToFourDigits(parseFloat(package_summary['psum_acquisition_revenue'])/parseFloat(adjustment_percentage));
        const pres_acquisition_interest_profit	= FloatToFourDigits(parseFloat(package_summary['psum_acquisition_profit'])/parseFloat(adjustment_percentage));
        const pres_acquisition_po_variable	= FloatToFourDigits(parseFloat(package_summary['psum_acquisition_overhead_percentage']));
        const pres_acquisition_po_expense	=  FloatToFourDigits(parseFloat(package_summary['psum_acquisition_overhead_expense'])/parseFloat(adjustment_percentage));
        const pres_acquisition_po_revenue	= FloatToFourDigits(parseFloat(package_summary['psum_acquisition_revenue'])/parseFloat(adjustment_percentage));
        const pres_acquisition_po_profit	= FloatToFourDigits(parseFloat(package_summary['psum_acquisition_profit'])/parseFloat(adjustment_percentage));
        const pres_acquisition_warranty_variable	= FloatToFourDigits(parseFloat(package_summary['psum_acquisition_warranty_percentage']));
        const pres_acquisition_warranty_expense	= FloatToFourDigits(parseFloat(package_summary['psum_acquisition_warranty_expense'])/parseFloat(adjustment_percentage));
        const pres_acquisition_warranty_revenue	= FloatToFourDigits(parseFloat(package_summary['psum_acquisition_revenue'])/parseFloat(adjustment_percentage));
        const pres_acquisition_warranty_profit	= FloatToFourDigits(parseFloat(package_summary['psum_acquisition_profit'])/parseFloat(adjustment_percentage));
        const pres_facility_sqft_expense	= FloatToFourDigits(parseFloat(package_summary['psum_facility_sqft_expense'])/parseFloat(adjustment_percentage));
        const pres_facility_sqft_revenue	= FloatToFourDigits(parseFloat(package_summary['psum_facility_sqft_revenue'])/parseFloat(adjustment_percentage));
        const pres_facility_sf_expense	= FloatToFourDigits(parseFloat(package_summary['psum_facility_sf_expense']));
        const pres_facility_sf_revenue	= FloatToFourDigits(parseFloat(package_summary['psum_facility_sf_revenue']));
        const pres_facility_variable	= FloatToFourDigits(parseFloat(package_summary['psum_facility_percentage']));
        const pres_facility_expense	= FloatToFourDigits(parseFloat(package_summary['psum_facility_expense'])/parseFloat(adjustment_percentage));
        const pres_facility_revenue	= FloatToFourDigits(parseFloat(package_summary['psum_facility_revenue'])/parseFloat(adjustment_percentage));
        const pres_facility_profit	= FloatToFourDigits(parseFloat(package_summary['psum_facility_profit'])/parseFloat(adjustment_percentage));
        const pres_opex_variable	= FloatToFourDigits(parseFloat(package_summary['psum_opex_percentage']));
        const pres_opex_expense	= FloatToFourDigits(parseFloat(package_summary['psum_opex_expense'])/parseFloat(adjustment_percentage));
        const pres_opex_revenue	= FloatToFourDigits(parseFloat(package_summary['psum_opex_revenue'])/parseFloat(adjustment_percentage));
        const pres_opex_profit	= FloatToFourDigits(parseFloat(package_summary['psum_opex_profit'])/parseFloat(adjustment_percentage));
        const pres_capital_variable	= FloatToFourDigits(parseFloat(package_summary['psum_capital_percentage']));
        const pres_capital_expense	= FloatToFourDigits(parseFloat(package_summary['psum_capital_expense'])/parseFloat(adjustment_percentage));
        const pres_capital_revenue	= FloatToFourDigits(parseFloat(package_summary['psum_capital_revenue'])/parseFloat(adjustment_percentage));
        const pres_capital_profit	= FloatToFourDigits(parseFloat(package_summary['psum_capital_profit'])/parseFloat(adjustment_percentage));
        const pres_labor_go_variable	= FloatToFourDigits(parseFloat(package_summary['psum_labor_go_percentage']));
        const pres_labor_go_expense	= FloatToFourDigits(parseFloat(package_summary['psum_labor_go_expense'])/parseFloat(adjustment_percentage));
        const pres_labor_go_revenue	= FloatToFourDigits(parseFloat(package_summary['psum_labor_go_revenue'])/parseFloat(adjustment_percentage));
        const pres_labor_go_profit	= FloatToFourDigits(parseFloat(package_summary['psum_labor_go_profit'])/parseFloat(adjustment_percentage));
        const pres_labor_mh_variable	= FloatToFourDigits(parseFloat(package_summary['psum_labor_mh_percentage']));
        const pres_labor_mh_expense	= FloatToFourDigits(parseFloat(package_summary['psum_labor_mh_expense'])/parseFloat(adjustment_percentage));
        const pres_labor_mh_revenue	= FloatToFourDigits(parseFloat(package_summary['psum_labor_mh_revenue'])/parseFloat(adjustment_percentage));
        const pres_labor_mh_profit	= FloatToFourDigits(parseFloat(package_summary['psum_labor_mh_profit'])/parseFloat(adjustment_percentage));
        const pres_labor_oh_variable	= FloatToFourDigits(parseFloat(package_summary['psum_labor_oh_percentage']));
        const pres_labor_oh_expense	= FloatToFourDigits(parseFloat(package_summary['psum_labor_oh_expense'])/parseFloat(adjustment_percentage));
        const pres_labor_oh_revenue	= FloatToFourDigits(parseFloat(package_summary['psum_labor_oh_revenue'])/parseFloat(adjustment_percentage));
        const pres_labor_oh_profit	= FloatToFourDigits(parseFloat(package_summary['psum_labor_oh_profit'])/parseFloat(adjustment_percentage));
        const pres_ff_variable	= FloatToFourDigits(parseFloat(package_summary['psum_ff_percentage']));
        const pres_ff_expense	= FloatToFourDigits(parseFloat(package_summary['psum_ff_expense'])/parseFloat(adjustment_percentage));
        const pres_ff_revenue	= FloatToFourDigits(parseFloat(package_summary['psum_ff_revenue'])/parseFloat(adjustment_percentage));
        const pres_ff_profit	= FloatToFourDigits(parseFloat(package_summary['psum_ff_profit'])/parseFloat(adjustment_percentage));
        const pres_custom_duties_variable = FloatToFourDigits(parseFloat(package_summary['psum_custom_duties_percentage']));
        const pres_custom_duties_expense = FloatToFourDigits(parseFloat(package_summary['psum_custom_duties_expense'])/parseFloat(adjustment_percentage));
        const pres_custom_duties_revenue = FloatToFourDigits(parseFloat(package_summary['psum_custom_duties_revenue'])/parseFloat(adjustment_percentage));
        const pres_custom_duties_profit = FloatToFourDigits(parseFloat(package_summary['psum_custom_duties_profit'])/parseFloat(adjustment_percentage));
        const pres_sga_variable	= FloatToFourDigits(parseFloat(package_summary['psum_sga_percentage']));
        const pres_sga_revenue	= FloatToFourDigits(parseFloat(package_summary['psum_sga_revenue'])/parseFloat(adjustment_percentage));
        const pres_sga_profit	= FloatToFourDigits(parseFloat(package_summary['psum_sga_profit'])/parseFloat(adjustment_percentage));
        const pres_profit_variable	= FloatToFourDigits(parseFloat(package_summary['psum_profit_percentage']));
        const pres_profit_revenue	= FloatToFourDigits(parseFloat(package_summary['psum_profit_revenue'])/parseFloat(adjustment_percentage));
        const pres_profit_profit	= FloatToFourDigits(parseFloat(package_summary['psum_profit_profit'])/parseFloat(adjustment_percentage));
        const pres_total_expense	= FloatToFourDigits(parseFloat(pres_component_expense)+parseFloat(pres_acquisition_interest_expense)+parseFloat(pres_facility_expense)+parseFloat(pres_opex_expense)+parseFloat(pres_capital_expense)+parseFloat(pres_labor_go_expense)+parseFloat(pres_labor_mh_expense)+parseFloat(pres_labor_oh_expense)+parseFloat(pres_ff_expense)+parseFloat(pres_custom_duties_expense));
        const pres_total_revenue	= FloatToFourDigits(parseFloat(pres_component_revenue)+parseFloat(pres_acquisition_interest_revenue)+parseFloat(pres_facility_revenue)+parseFloat(pres_opex_revenue)+parseFloat(pres_capital_revenue)+parseFloat(pres_labor_go_revenue)+parseFloat(pres_labor_mh_revenue)+parseFloat(pres_labor_oh_revenue)+parseFloat(pres_ff_revenue)+parseFloat(pres_sga_revenue)+parseFloat(pres_profit_revenue)+parseFloat(pres_custom_duties_revenue));
        const pres_total_profit	= FloatToFourDigits(parseFloat(pres_component_profit)+parseFloat(pres_acquisition_interest_profit)+parseFloat(pres_facility_profit)+parseFloat(pres_opex_profit)+parseFloat(pres_capital_profit)+parseFloat(pres_labor_go_profit)+parseFloat(pres_labor_mh_profit)+parseFloat(pres_labor_oh_profit)+parseFloat(pres_ff_profit)+parseFloat(pres_sga_profit)+parseFloat(pres_profit_profit)+parseFloat(pres_custom_duties_profit));
        const pres_total_variable	= FloatToFourDigits(parseFloat(pres_total_profit)/parseFloat(pres_total_revenue));
        const pres_gross_total_profit	= FloatToFourDigits(parseFloat(pres_total_profit)+parseFloat(pres_acquisition_interest_revenue));
        const pres_gross_total_variable	= FloatToFourDigits(parseFloat(pres_gross_total_profit)/parseFloat(pres_total_revenue));
        const pres_ebitda_variable	= FloatToFourDigits(parseFloat(pres_total_profit)+parseFloat(pres_capital_expense)+parseFloat(pres_facility_expense));
        const pres_go	= FloatToFourDigits(parseFloat(package_summary['psum_go_headcount'])/parseFloat(adjustment_percentage));
        const pres_mh	= FloatToFourDigits(parseFloat(package_summary['psum_mh_headcount'])/parseFloat(adjustment_percentage));
        const pres_bu	= package_summary['psum_facility_name'];
        const pres_total_eau	= FloatToFourDigits(parseFloat(package_summary['psum_rfq_eau'])/parseFloat(adjustment_percentage));
        const pres_updated_at= "NOW()";

        

        const presentation_summary_update = {
          pres_component_variable:pres_component_variable,	
          pres_component_expense:pres_component_expense,	
          pres_component_revenue:pres_component_revenue,	
          pres_component_profit:pres_component_profit,	
          pres_acquisition_outlay_variable:pres_acquisition_outlay_variable,	
          pres_acquisition_outlay_expense:pres_acquisition_outlay_expense,	
          pres_acquisition_outlay_revenue:pres_acquisition_outlay_revenue,	
          pres_acquisition_outlay_profit:pres_acquisition_outlay_profit,	
          pres_acquisition_net_work_variable:pres_acquisition_net_work_variable,	
          pres_acquisition_net_work_expense:pres_acquisition_net_work_expense,	
          pres_acquisition_net_work_revenue:pres_acquisition_net_work_revenue,	
          pres_acquisition_net_work_profit:pres_acquisition_net_work_profit,	
          pres_acquisition_interest_variable:pres_acquisition_interest_variable,	
          pres_acquisition_interest_expense:pres_acquisition_interest_expense,	
          pres_acquisition_interest_revenue:pres_acquisition_interest_revenue,	
          pres_acquisition_interest_profit:pres_acquisition_interest_profit,	
          pres_acquisition_po_variable:pres_acquisition_po_variable,	
          pres_acquisition_po_expense:pres_acquisition_po_expense,	
          pres_acquisition_po_revenue:pres_acquisition_po_revenue,	
          pres_acquisition_po_profit:pres_acquisition_po_profit,	
          pres_acquisition_warranty_variable:pres_acquisition_warranty_variable,	
          pres_acquisition_warranty_expense:pres_acquisition_warranty_expense,	
          pres_acquisition_warranty_revenue:pres_acquisition_warranty_revenue,	
          pres_acquisition_warranty_profit:pres_acquisition_warranty_profit,	
          pres_facility_sqft_variable:pres_facility_sqft_variable,	
          pres_facility_sqft_expense:pres_facility_sqft_expense,	
          pres_facility_sqft_revenue:pres_facility_sqft_revenue,	
          pres_facility_sqft_profit:pres_facility_sqft_profit,	
          pres_facility_sf_variable:pres_facility_sf_variable,	
          pres_facility_sf_expense:pres_facility_sf_expense,	
          pres_facility_sf_revenue:pres_facility_sf_revenue,	
          pres_facility_sf_profit:pres_facility_sf_profit,	
          pres_facility_variable:pres_facility_variable,	
          pres_facility_expense:pres_facility_expense,	
          pres_facility_revenue:pres_facility_revenue,	
          pres_facility_profit:pres_facility_profit,	
          pres_opex_variable:pres_opex_variable,	
          pres_opex_expense:pres_opex_expense,	
          pres_opex_revenue:pres_opex_revenue,	
          pres_opex_profit:pres_opex_profit,	
          pres_capital_variable:pres_capital_variable,	
          pres_capital_expense:pres_capital_expense,	
          pres_capital_revenue:pres_capital_revenue,	
          pres_capital_profit:pres_capital_profit,	
          pres_labor_go_variable:pres_labor_go_variable,	
          pres_labor_go_expense:pres_labor_go_expense,	
          pres_labor_go_revenue:pres_labor_go_revenue,	
          pres_labor_go_profit:pres_labor_go_profit,	
          pres_labor_mh_variable:pres_labor_mh_variable,	
          pres_labor_mh_expense:pres_labor_mh_expense,	
          pres_labor_mh_revenue:pres_labor_mh_revenue,	
          pres_labor_mh_profit:pres_labor_mh_profit,	
          pres_labor_oh_variable:pres_labor_oh_variable,	
          pres_labor_oh_expense:pres_labor_oh_expense,	
          pres_labor_oh_revenue:pres_labor_oh_revenue,	
          pres_labor_oh_profit:pres_labor_oh_profit,	
          pres_ff_variable:pres_ff_variable,	
          pres_ff_expense:pres_ff_expense,	
          pres_ff_revenue:pres_ff_revenue,	
          pres_ff_profit:pres_ff_profit,	
          pres_custom_duties_variable:pres_custom_duties_variable,	
          pres_custom_duties_expense:pres_custom_duties_expense,	
          pres_custom_duties_revenue:pres_custom_duties_revenue,	
          pres_custom_duties_profit:pres_custom_duties_profit,	
          pres_sga_variable:pres_sga_variable,	
          pres_sga_expense:pres_sga_expense,	
          pres_sga_revenue:pres_sga_revenue,	
          pres_sga_profit:pres_sga_profit,	
          pres_profit_variable:pres_profit_variable,	
          pres_profit_expense:pres_profit_expense,	
          pres_profit_revenue:pres_profit_revenue,	
          pres_profit_profit:pres_profit_profit,	
          pres_total_variable:pres_total_variable,	
          pres_total_expense:pres_total_expense,	
          pres_total_revenue:pres_total_revenue,	
          pres_total_profit:pres_total_profit,	
          pres_gross_total_variable:pres_gross_total_variable,	
          pres_gross_total_expense:pres_gross_total_expense,	
          pres_gross_total_revenue:pres_gross_total_revenue,	
          pres_gross_total_profit:pres_gross_total_profit,	
          pres_ebitda_variable:pres_ebitda_variable,	
          pres_ebitda_expense:pres_ebitda_expense,	
          pres_ebitda_revenue:pres_ebitda_revenue,	
          pres_ebitda_profit:pres_ebitda_profit,	
          pres_go:pres_go,	
          pres_mh:pres_mh,	
          pres_bu:pres_bu,	
          pres_total_eau:pres_total_eau,	
          pres_updated_at:pres_updated_at,
        }

        const update_result = await UpdateRow("presentation_summary", { pres_uuid: pres_uuid }, presentation_summary_update);
      }
      resolve(true);
    } catch (error) {
      reject(error);
    }
  });
};

// FloatToFourDigits
const FloatToFourDigits = (value) => {
  if (value == "0") {
    return "0.0000";
  }
  let float_value = parseFloat(value).toFixed(4);
  return float_value;
};

module.exports = {
  FunctionCalculationReCalulate,
  PackageSummaryDataReCalulateOnSummaryStatusChange,
  PackageSummaryDataReCalulateOnUpdate
};
