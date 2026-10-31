"""Tests for the input-driven soil condition screening index."""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from engine.fuzzy_inference import infer_fertility


class ScreeningScoreTests(unittest.TestCase):
    def test_score_uses_available_input_factors_instead_of_rule_center(self):
        result = infer_fertility(
            ph=5.2,
            moisture=18,
            visual_condition="good",
            rules=[],
        )

        self.assertNotEqual(result["screeningScore"], 55.0)
        self.assertEqual(
            [factor["name"] for factor in result["screeningFactors"]],
            ["pH condition", "Moisture condition", "Visual condition"],
        )
        self.assertAlmostEqual(
            result["screeningScore"],
            sum(factor["score"] for factor in result["screeningFactors"]) / 3,
        )

    def test_score_changes_when_measurements_change(self):
        poor_conditions = infer_fertility(5.2, 18, "good")["screeningScore"]
        favorable_conditions = infer_fertility(6.5, 50, "good")["screeningScore"]

        self.assertIsNotNone(poor_conditions)
        self.assertGreater(favorable_conditions, poor_conditions)

    def test_missing_inputs_are_not_replaced_with_a_default_score(self):
        result = infer_fertility(None, None, "unknown")

        self.assertIsNone(result["screeningScore"])
        self.assertEqual(result["screeningFactors"], [])
        self.assertFalse(result["inputsUsed"]["visualCondition"])
        self.assertIn("unavailable", result["explanation"])

    def test_partial_inputs_are_equally_weighted_over_available_factors(self):
        result = infer_fertility(6.5, None, "unknown")

        self.assertEqual(len(result["screeningFactors"]), 1)
        self.assertEqual(result["screeningFactors"][0]["weightPercent"], 100.0)
        self.assertEqual(result["screeningScore"], result["screeningFactors"][0]["score"])


if __name__ == "__main__":
    unittest.main()
