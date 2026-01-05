use regex::Regex;
use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImageMetadata {
    pub date: Option<String>,
    pub subject: Option<String>,
    pub series: Option<String>,
    pub a: Option<u32>,
    pub b: Option<u32>,
    pub frame: Option<u32>,
    pub tokens: Vec<String>,
}

static DATE_REGEX: OnceLock<Regex> = OnceLock::new();
static NUMBER_REGEX: OnceLock<Regex> = OnceLock::new();

fn get_date_regex() -> &'static Regex {
    DATE_REGEX.get_or_init(|| Regex::new(r"^\d{4}-\d{2}-\d{2}").unwrap())
}

fn get_number_regex() -> &'static Regex {
    NUMBER_REGEX.get_or_init(|| Regex::new(r"\d+").unwrap())
}

pub fn parse_filename(filename: &str) -> ImageMetadata {
    let name_without_ext = filename
        .trim_end_matches(".png")
        .trim_end_matches(".PNG");

    let date_regex = get_date_regex();
    let date = date_regex
        .find(name_without_ext)
        .map(|m| m.as_str().to_string());

    let parts: Vec<&str> = name_without_ext
        .split(|c| c == '-' || c == '_' || c == '.')
        .filter(|s| !s.is_empty())
        .collect();

    let mut tokens = Vec::new();
    let mut subject = None;
    let mut series = None;
    let mut numbers = Vec::new();

    for part in parts.iter() {
        let lower = part.to_lowercase();
        tokens.push(lower.clone());

        if lower.contains("delta") {
            series = Some(part.to_string());
        } else if lower.len() > 2 && !part.chars().all(|c| c.is_numeric()) {
            if subject.is_none() && date.is_none() {
                subject = Some(part.to_string());
            } else if subject.is_some() && series.is_none() {
                subject = Some(part.to_string());
            }
        }

        let number_regex = get_number_regex();
        for num_match in number_regex.find_iter(part) {
            if let Ok(n) = num_match.as_str().parse::<u32>() {
                numbers.push(n);
            }
        }
    }

    let (a, b, frame) = match numbers.len() {
        0 => (None, None, None),
        1 => (None, None, Some(numbers[0])),
        2 => (Some(numbers[0]), None, Some(numbers[1])),
        _ => (Some(numbers[0]), Some(numbers[1]), Some(numbers[2])),
    };

    ImageMetadata {
        date,
        subject,
        series,
        a,
        b,
        frame,
        tokens,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_with_date() {
        let meta = parse_filename("2025-07-23-sasamat-delta3-0028.png");
        assert_eq!(meta.date, Some("2025-07-23".to_string()));
        assert!(meta.tokens.contains(&"sasamat".to_string()));
    }

    #[test]
    fn test_parse_numbers() {
        let meta = parse_filename("test-12-34-56.png");
        assert_eq!(meta.a, Some(12));
        assert_eq!(meta.b, Some(34));
        assert_eq!(meta.frame, Some(56));
    }
}
