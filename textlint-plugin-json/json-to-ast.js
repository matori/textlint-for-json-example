const { parse } = require('@humanwhocodes/momoa');
const { traverse } = require('@textlint/ast-traverse');
const { ASTNodeTypes } = require('@textlint/ast-node-types');

const momoaOptions = {
  comments: false,
  ranges: true,
  tokens: false,
};

exports.parse = function (text) {
  const jsonAST = parse(text, momoaOptions);
  const AST = {
    type: ASTNodeTypes.Document,
    loc: {
      start: {
        line: jsonAST.loc.start.line,
        // momoaのastでは1から始まるので1を引く
        column: jsonAST.loc.start.column - 1,
      },
      end: {
        line: jsonAST.loc.end.line,
        // momoaのastでは1から始まるので1を引く
        column: jsonAST.loc.end.column - 1,
      },
    },
    range: jsonAST.range,
    raw: text,
  };

  const children = [];

  let prevNode;
  traverse(jsonAST, {
    enter(node) {
      if (node.type === 'String' && prevNode?.type !== 'Member') {
        const paragraph = createParagraphNode(node);
        children.push(paragraph);
      }
      prevNode = node;
    },
    leave() {},
  });

  AST.children = children;
  return AST;
};

function createParagraphNode(stringNode) {
  const loc = {
    start: {
      line: stringNode.loc.start.line,
      // momoaのastでは1から始まるので1を引く
      column: stringNode.loc.start.column - 1,
    },
    end: {
      line: stringNode.loc.end.line,
      // momoaのastでは1から始まるので1を引く
      column: stringNode.loc.end.column - 1,
    },
  };

  const paragraph = {
    type: ASTNodeTypes.Paragraph,
    raw: stringNode.value,
    loc,
    range: stringNode.range,
    children: createParagraphChildNodes(stringNode.value, loc, stringNode.range),
  };

  return paragraph;
}

function createParagraphChildNodes(raw, loc, range) {
  const split = raw.split((/(\r\n|\r|\n)/));
  const filtered = split.filter((text) => text.length);
  const initialAcc = {
    relativeStart: 1,
    children: [],
  };
  const data = filtered.reduce(paragraphChildrenReducer.bind(null, loc, range), initialAcc);
  return data.children;
}

function paragraphChildrenReducer(loc, range, acc, text) {
  const columnStart = loc.start.column + acc.relativeStart;
  const rangeStart = range[0] + acc.relativeStart;

  const node = {
    raw: text,
    loc: {
      start: {
        line: loc.start.line,
        column: columnStart,
      },
      end: {
        line: loc.end.line,
        column: columnStart + text.length,
      },
    },
    range: [rangeStart, rangeStart + text.length],
  };
  if (/\r\n|\r|\n/.test(text)) {
    // 改行コードは \r や \n が1文字と判定されてしまうが、実際のJSONでは2文字
    // text.length をそのまま渡すとバグるので、ここで調整する
    const textLength = text.length * 2;
    node.type = ASTNodeTypes.Break;
    acc.relativeStart = acc.relativeStart + textLength;

  } else {
    node.type = ASTNodeTypes.Str;
    node.value = text;
    acc.relativeStart = acc.relativeStart + text.length;
  }
  acc.children.push(node);
  return acc;
}
