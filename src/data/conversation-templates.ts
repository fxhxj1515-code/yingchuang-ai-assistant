/**
 * Built-in conversation templates — "从模板创建" feature.
 * Each template defines a multi-model group chat with a specific purpose.
 */
export interface ConversationTemplate {
  id: string;
  title: string;
  description: string;
  /** Expected modelIds to match against available models */
  participants: { modelId: string; identityId: string | null }[];
  groupSystemPrompt: string;
}

export const conversationTemplates: ConversationTemplate[] = [
  {
    id: "research-debate",
    title: "科研辩论组",
    description: "DeepSeek 与 Qwen 从不同角度辩论科研问题，碰撞思维火花",
    participants: [
      { modelId: "deepseek-chat", identityId: null },
      { modelId: "qwen-turbo", identityId: null },
    ],
    groupSystemPrompt:
      "你们是科研辩论小组。请对用户提出的科研问题进行多角度讨论。\n" +
      "DeepSeek 角色：偏向理论深度和前沿探索，擅长引用最新论文和理论框架。\n" +
      "Qwen 角色：偏向工程实践和落地应用，关注实验验证和实际可行性。\n" +
      "请轮流发言，每个角色先阐述自己的观点，然后可以互相提问和反驳。最后尝试达成一个综合结论。",
  },
  {
    id: "writing-polish",
    title: "写作润色组",
    description: "一人写作、一人润色、一人校对，打造高质量文稿",
    participants: [
      { modelId: "deepseek-chat", identityId: null },
      { modelId: "qwen-turbo", identityId: null },
      { modelId: "gpt-4o-mini", identityId: null },
    ],
    groupSystemPrompt:
      "你们是专业写作团队。对用户提供的文本进行三轮协作：\n" +
      "1. 写手（DeepSeek）：根据用户需求创作初稿，注重内容的完整性和创新性。\n" +
      "2. 润色师（Qwen）：优化语言表达，改进句式结构，提升文采和可读性。\n" +
      "3. 校对员（GPT-4o-mini）：检查语法错误、逻辑漏洞和格式规范，给出最终修改建议。\n" +
      "依次发言，每轮完成后请明确标注自己的角色分工。",
  },
  {
    id: "code-review",
    title: "代码审查组",
    description: "模拟代码审查会议，多模型协作排查代码问题",
    participants: [
      { modelId: "deepseek-chat", identityId: null },
      { modelId: "qwen-turbo", identityId: null },
    ],
    groupSystemPrompt:
      "你们是代码审查团队。对用户提交的代码进行全面的技术审查：\n" +
      "DeepSeek：侧重架构设计、性能优化和安全漏洞分析，关注代码的可维护性和扩展性。\n" +
      "Qwen：侧重代码规范、命名约定、测试覆盖率和文档完整性。\n" +
      "请依次审查，先指出优点再提出改进建议。对关键问题展开讨论，最终给出综合审查报告。",
  },
  {
    id: "brainstorm",
    title: "头脑风暴组",
    description: "自由讨论模式下多模型头脑风暴，激发创意灵感",
    participants: [
      { modelId: "deepseek-chat", identityId: null },
      { modelId: "qwen-turbo", identityId: null },
      { modelId: "gpt-4o-mini", identityId: null },
    ],
    groupSystemPrompt:
      "你们是一个创意头脑风暴团队。对用户提出的问题或主题进行自由讨论：\n" +
      "规则：\n" +
      "1. 每人从自己的专业视角出发提出想法和观点。\n" +
      "2. 不批评任何想法，先发散再收敛。\n" +
      "3. 在前人想法的基楚上继续延伸和创新。\n" +
      "4. 至少发散5轮后，由最后一人总结出3-5个最具可行性的方案。\n" +
      "请开始讨论，每轮标注发言角色名称。",
  },
];

/**
 * Given a set of available modelIds (from provider store),
 * find which template participants can be matched.
 * Returns matched model IDs for template participants.
 */
export function matchTemplateModels(
  template: ConversationTemplate,
  availableModels: { id: string; modelId: string }[],
): { modelId: string; matchedId: string; identityId: string | null }[] {
  const result: { modelId: string; matchedId: string; identityId: string | null }[] = [];
  for (const participant of template.participants) {
    const matched = availableModels.find((m) => m.modelId === participant.modelId);
    if (matched) {
      result.push({ modelId: matched.id, matchedId: matched.id, identityId: participant.identityId });
    }
  }
  return result;
}
