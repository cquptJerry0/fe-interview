import importlib.util
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'scripts' / f'{name}.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


checker = load('check_skill')
reviewer = load('review_text')


class StructureTests(unittest.TestCase):
    def test_real_skill_structure(self):
        self.assertTrue(checker.validate(ROOT, allow_private_sources=True)['passed'])

    def test_language_calibration_and_template_boundary(self):
        entry = (ROOT / 'SKILL.md').read_text()
        self.assertIn('references/核心规则/语言诊断与校准.md', entry)
        self.assertIn('不调用 `technical-document-writing` 或 `distill-work-summary` 作为写作模板', entry)
        rules = (ROOT / 'references/核心规则/语言诊断与校准.md').read_text()
        for phrase in ['保留', '轻改', '局部重组', '保真', '位置／原句', '阅读收益']:
            self.assertIn(phrase, rules)

    def test_original_case_feedback_and_quote_are_preserved(self):
        original = ROOT / 'references/样本/原案例'
        for name in ['来源与适用场景.md', '优秀片段解析.md', '失败与纠偏记录.md']:
            self.assertTrue((original / name).is_file())
        history = (original / '失败与纠偏记录.md').read_text()
        for quote in ['句与句之间没啥联系', '还是感觉你这样一大段的话读起来AI味很重',
                      '分类内保留原任务顺序，避免合批改变素材内容和排列。', '非常好', '全文只暂定保留']:
            self.assertIn(quote, history)
        positive = (original / '优秀片段解析.md').read_text()
        self.assertIn('BPM：条件决定选择，例子保持连续', positive)
        self.assertIn('onenet-cli', positive)

    def test_private_case_mode_is_scoped(self):
        import shutil
        with tempfile.TemporaryDirectory() as temp:
            copy = Path(temp) / 'writing-collab'
            shutil.copytree(ROOT, copy, ignore=shutil.ignore_patterns('__pycache__'))
            case = copy / 'references/样本/原案例/来源与适用场景.md'
            case.write_text(case.read_text() + '\n[原会话](codex://threads/example)\nhttps://example.larkoffice.com/docx/example\n')
            self.assertFalse(checker.validate(copy)['passed'])
            self.assertTrue(checker.validate(copy, allow_private_sources=True)['passed'])
            entry = copy / 'SKILL.md'
            entry.write_text(entry.read_text() + '\nhttps://example.larkoffice.com/docx/example\n')
            self.assertFalse(checker.validate(copy, allow_private_sources=True)['passed'])


    def test_missing_entry_fails(self):
        with tempfile.TemporaryDirectory() as temp:
            self.assertFalse(checker.validate(temp)['passed'])

    def test_loading_rules_are_mandatory_before_draft(self):
        entry = (ROOT / 'SKILL.md').read_text()
        self.assertIn('在生成正文前完整读取下面四份核心规则', entry)
        self.assertIn('局部任务只加载影响范围对应规则', entry)
        self.assertIn('明确要求直接写时', entry)

    def test_rule_ownership_and_test_routes(self):
        entry = (ROOT / 'SKILL.md').read_text()
        for name in ['首稿整体逻辑', '语言与格式红线', '多轮纠偏与恢复', '场景适配与事实边界', '文档转换与范围保持']:
            self.assertIn(f'tests/{name}.md', entry)
        draft = (ROOT / 'references/写作流程/正文生成.md').read_text()
        self.assertIn('共同理由交代一次', draft)

    def test_positive_statement_redline_is_prominent(self):
        entry = (ROOT / 'SKILL.md').read_text()
        self.assertLess(entry.index('## 大红线：直接陈述对象、动作与结果'),
                        entry.index('## 每次生成正文都执行'))
        self.assertIn('先说做什么，再补一句不做什么', entry)
        detail = (ROOT / 'references/核心规则/语言与最终状态.md').read_text()
        self.assertIn('相邻句、分点、段落', detail)
        self.assertIn('已消费额度不再追扣', detail)
        cases = (ROOT / 'tests/语言与格式红线.md').read_text()
        self.assertIn('同类内容放入下一句、下一点或交付说明仍判失败', cases)

    def test_no_legacy_reference_tree(self):
        for folder in ['内容指导', '逻辑与语言', '格式与图表', '协作与验收', '目标与取舍']:
            self.assertFalse((ROOT / 'references' / folder).exists())


class CandidateReviewTests(unittest.TestCase):
    def test_rejected_option_candidate(self):
        result = reviewer.review('本方案不采用临时工作流。')
        self.assertIn('process_or_rejected_option', result['candidates'][0]['reasons'])

    def test_parallel_interface_candidate(self):
        result = reviewer.review('服务甲：创建；服务乙：更新；服务丙：查询。')
        self.assertIn('multiple_parallel_items', result['candidates'][0]['reasons'])

    def test_necessary_negative_is_not_failed(self):
        result = reviewer.review('退款只回收原订单剩余额度，已消费额度不再追扣。')
        self.assertNotIn('passed', result)
        self.assertIn('necessary negatives', result['required_manual_checks'])
        self.assertIn('keep necessary', result['candidates'][0]['decision'])

    def test_empty_result_is_not_quality_proof(self):
        result = reviewer.review('执行服务保存任务与逐项结果。')
        self.assertEqual(result['candidates'], [])
        self.assertNotIn('passed', result)

    def test_template_candidate(self):
        self.assertIn('template_instruction', reviewer.review('此处填写模块目标。')['candidates'][0]['reasons'])

    def test_native_list_is_not_parallel_sentence(self):
        result = reviewer.review('- 服务甲：创建；条件一；结果一。')
        self.assertFalse(result['candidates'])


if __name__ == '__main__':
    unittest.main()
