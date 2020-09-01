module.exports = {
	extends: 'airbnb-base',
	// override airbnb rules here
	rules: {
		indent: [2, 'tab'],
		'no-tabs': 0,
		'linebreak-style': 0,
		'no-console': 0,
		'comma-dangle': 0,
		'consistent-return': 0,
		'no-underscore-dangle': 0,
		'eol-last': 0,
		'max-len': [2, {
			code: 200,
			ignoreComments: true
		}],
		'prefer-destructuring': [2, {
			object: true,
			array: false
		}],
		'no-restricted-syntax': ['error', 'ForInStatement', 'LabeledStatement', 'WithStatement'],
		'no-param-reassign': 0,
	},
	globals: {
		AWS: true,
		render: true,
		sessionStorageKeys: true,
		Swal: true,
	},
	env: {
		node: true,
		browser: true,
		jest: true,
		jquery: true,
	}
};