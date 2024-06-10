const FunctionMTMCalulate = (params) => {
  return new Promise((resolve, reject) => {
    try {
      const mtm_estimated_piece_per_pallet =
        parseFloat(params["mtm_estimated_piece_per_pallet"]);
      const mtm_piece_per_assembly = parseFloat(params["mtm_piece_per_assembly"])
        ? parseFloat(params["mtm_piece_per_assembly"])
        : parseFloat(params["p_piece_per_assembly"]);
      const mtm_annual_volume =
        parseFloat(params["engineering_variable_eau"]) * parseFloat(mtm_piece_per_assembly);
      var mtm_annual_pallets =
        parseFloat(mtm_annual_volume) / parseFloat(mtm_estimated_piece_per_pallet);
      var annual_pallets_string = mtm_annual_pallets.toString();
      var annual_pallets = annual_pallets_string.split(".");
      var mtm_annual_pallet =
        parseInt(annual_pallets[0]) + (parseInt(annual_pallets[1]) > 0 ? 1 : 0);
      var mtm_pallet_on_hands =
        parseFloat(mtm_annual_pallet) / parseInt(params["engineering_variable_build_months"]);
      var pallet_on_hands_string = mtm_pallet_on_hands.toString();
      var pallet_on_hands = pallet_on_hands_string.split(".");
      var mtm_pallet_on_hand =
        (parseInt(pallet_on_hands[0]) +
          (parseInt(pallet_on_hands[1]) > 0 ? 1 : 0)) *
        parseInt(params["engineering_variable_months_on_hand"]);
      var mtm_sqfts =
        ((parseFloat(mtm_pallet_on_hand) / parseFloat(params["engineering_variable_stack_height"])) *
          parseFloat(params["engineering_variable_pallet"])) /
        (parseFloat(params["engineering_variable_storage_efficiency"]) / 100);
      var sqfts_string = mtm_sqfts.toString();
      var sqfts = sqfts_string.split(".");
      var mtm_sqft = parseInt(sqfts[0]) + (parseInt(sqfts[1]) > 0 ? 1 : 0);
      var mtm_skid_per_assembly =
        (1 / parseFloat(mtm_estimated_piece_per_pallet)) * parseFloat(mtm_piece_per_assembly);

      var mtm_moq_pallet_on_hand = null;
      if (parseFloat(params["p_cost_per_piece"]) === 0) {
        mtm_moq_pallet_on_hand = 0;
      } else {
        if (parseInt(params["mtm_pallet_per_moq"]) > parseInt(mtm_pallet_on_hand)) {
          mtm_moq_pallet_on_hand = parseInt(params["mtm_pallet_per_moq"]);
        } else {
          mtm_moq_pallet_on_hand = parseInt(mtm_pallet_on_hand);
        }
      }

      var mtmParams = {
        id: params["mtm_id"],
        mtm_uuid: params["mtm_uuid"],
        mtm_annual_volume: mtm_annual_volume,
        mtm_estimated_piece_per_pallet: mtm_estimated_piece_per_pallet,
        mtm_annual_pallet: mtm_annual_pallet,
        mtm_pallet_on_hand: mtm_pallet_on_hand,
        mtm_sqft: mtm_sqft,
        mtm_skid_per_assembly: mtm_skid_per_assembly,
        mtm_piece_per_assembly: mtm_piece_per_assembly,
        mtm_moq_pallet_on_hand: mtm_moq_pallet_on_hand
      };
      resolve(mtmParams);
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  FunctionMTMCalulate,
};
